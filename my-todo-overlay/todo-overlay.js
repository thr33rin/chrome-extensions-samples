// Avoid injecting twice if the script runs again
if (!window.__todoOverlayInjected) {
  window.__todoOverlayInjected = true;

  (function () {
    const STORAGE_KEY = "todoOverlayItems";
    const STORAGE_REMINDER_KEY = "todoOverlayReminderMinutes";

    let items = [];
    let reminderMinutes = null;
    let reminderIntervalId = null;

    // --- Small overlay panel ---

    const container = document.createElement("div");
    container.id = "todo-overlay-container";

    // Header
    const header = document.createElement("div");
    header.id = "todo-overlay-header";

    const title = document.createElement("span");
    title.textContent = "To-do";

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "todo-overlay-toggle";
    toggleBtn.textContent = "–"; // minimise

    header.appendChild(title);
    header.appendChild(toggleBtn);

    // Body
    const body = document.createElement("div");
    body.id = "todo-overlay-body";

    // Input row
    const inputRow = document.createElement("div");
    inputRow.id = "todo-overlay-input-row";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "New task...";

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add";

    inputRow.appendChild(input);
    inputRow.appendChild(addBtn);

    // Reminder settings row
    const reminderRow = document.createElement("div");
    reminderRow.id = "todo-overlay-reminder-row";

    const reminderLabel = document.createElement("span");
    reminderLabel.textContent = "Remind every";

    const reminderInput = document.createElement("input");
    reminderInput.type = "number";
    reminderInput.min = "0.1";
    reminderInput.step = "0.1";
    reminderInput.placeholder = "mins";

    const reminderButton = document.createElement("button");
    reminderButton.textContent = "Set";

    reminderRow.appendChild(reminderLabel);
    reminderRow.appendChild(reminderInput);
    reminderRow.appendChild(reminderButton);

    // List
    const list = document.createElement("ul");
    list.id = "todo-overlay-list";

    body.appendChild(inputRow);
    body.appendChild(reminderRow);
    body.appendChild(list);

    container.appendChild(header);
    container.appendChild(body);

    document.documentElement.appendChild(container);

    // --- Big reminder overlay ---

    const reminderOverlay = document.createElement("div");
    reminderOverlay.id = "todo-reminder-overlay";

    const reminderBox = document.createElement("div");
    reminderBox.id = "todo-reminder-box";

    const reminderTitle = document.createElement("h2");
    reminderTitle.textContent = "To-do check-in";

    const reminderText1 = document.createElement("p");
    const reminderText2 = document.createElement("p");

    const reminderButtons = document.createElement("div");
    reminderButtons.id = "todo-reminder-buttons";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "OK";

    reminderButtons.appendChild(closeBtn);

    reminderBox.appendChild(reminderTitle);
    reminderBox.appendChild(reminderText1);
    reminderBox.appendChild(reminderText2);
    reminderBox.appendChild(reminderButtons);

    reminderOverlay.appendChild(reminderBox);
    document.documentElement.appendChild(reminderOverlay);

    closeBtn.addEventListener("click", () => {
      reminderOverlay.style.display = "none";
    });

    function showReminderPopup() {
      const total = items.length;
      const done = items.filter((i) => i.done).length;

      console.log("[todo-overlay] reminder fired. done:", done, "total:", total);

      if (total === 0) {
        return;
      }

      if (done === total) {
        return;
      }

      reminderText1.textContent = `You have completed ${done} of ${total} tasks.`;

      const remaining = total - done;
      reminderText2.textContent =
        remaining === 1
          ? "You still have 1 task left. Fancy finishing it?"
          : `You still have ${remaining} tasks left. Time to chip away at them.`;

      reminderOverlay.style.display = "flex";
    }

    // --- Storage & state ---

    function loadState() {
      if (!chrome || !chrome.storage || !chrome.storage.sync) {
        console.warn("[todo-overlay] chrome.storage.sync not available");
        return;
      }

      chrome.storage.sync.get([STORAGE_KEY, STORAGE_REMINDER_KEY], (result) => {
        if (Array.isArray(result[STORAGE_KEY])) {
          items = result[STORAGE_KEY];
        } else {
          items = [];
        }

        if (typeof result[STORAGE_REMINDER_KEY] === "number") {
          reminderMinutes = result[STORAGE_REMINDER_KEY];
          reminderInput.value = String(reminderMinutes);
          setupReminderInterval();
        }

        renderList();
      });
    }

    function saveItems() {
      if (!chrome || !chrome.storage || !chrome.storage.sync) return;
      chrome.storage.sync.set({ [STORAGE_KEY]: items });
    }

    function saveReminderMinutes() {
      if (!chrome || !chrome.storage || !chrome.storage.sync) return;

      if (typeof reminderMinutes === "number" && reminderMinutes > 0) {
        chrome.storage.sync.set({ [STORAGE_REMINDER_KEY]: reminderMinutes });
      } else {
        chrome.storage.sync.remove(STORAGE_REMINDER_KEY);
      }
    }

    function renderList() {
      list.innerHTML = "";

      items.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "todo-overlay-item";
        if (item.done) {
          li.classList.add("done");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!item.done;

        checkbox.addEventListener("change", () => {
          items[index].done = checkbox.checked;
          saveItems();
          renderList();
        });

        const textSpan = document.createElement("span");
        textSpan.textContent = item.text;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "✕";
        deleteBtn.title = "Delete";

        deleteBtn.addEventListener("click", () => {
          items.splice(index, 1);
          saveItems();
          renderList();
        });

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(deleteBtn);

        list.appendChild(li);
      });
    }

    function addItemFromInput() {
      const value = input.value.trim();
      if (!value) return;

      items.push({ text: value, done: false });
      input.value = "";
      saveItems();
      renderList();
    }

    addBtn.addEventListener("click", addItemFromInput);

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        addItemFromInput();
      }
    });

    // Minimise / maximise
    let collapsed = false;
    toggleBtn.addEventListener("click", () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? "none" : "flex";
      toggleBtn.textContent = collapsed ? "+" : "–";
    });

    // --- Reminder interval ---

    function setupReminderInterval() {
      if (reminderIntervalId) {
        clearInterval(reminderIntervalId);
        reminderIntervalId = null;
      }

      if (
        typeof reminderMinutes === "number" &&
        reminderMinutes > 0 &&
        isFinite(reminderMinutes)
      ) {
        const ms = reminderMinutes * 60 * 1000;
        console.log("[todo-overlay] setting reminder interval to", ms, "ms");
        reminderIntervalId = setInterval(() => {
          showReminderPopup();
        }, ms);
      } else {
        console.log("[todo-overlay] reminder disabled");
      }
    }

    reminderButton.addEventListener("click", () => {
      const value = parseFloat(reminderInput.value);
      if (isNaN(value) || value <= 0) {
        alert("Please enter a positive number of minutes (you can use decimals).");
        return;
      }
      reminderMinutes = value;
      saveReminderMinutes();
      setupReminderInterval();
      reminderButton.textContent = "Set ✓";
      setTimeout(() => {
        reminderButton.textContent = "Set";
      }, 1000);
    });

    // Initial load
    loadState();
  })();
}
