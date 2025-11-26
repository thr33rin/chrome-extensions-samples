// Avoid injecting twice if the script runs again
if (!window.__todoOverlayInjected) {
  window.__todoOverlayInjected = true;

  (function () {
    const STORAGE_KEY = "todoOverlayItems";

    let items = [];

    // Create root container
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

    // List
    const list = document.createElement("ul");
    list.id = "todo-overlay-list";

    body.appendChild(inputRow);
    body.appendChild(list);

    container.appendChild(header);
    container.appendChild(body);

    document.documentElement.appendChild(container);

    // Load existing items from chrome.storage
    function loadItems() {
      if (!chrome || !chrome.storage || !chrome.storage.sync) {
        console.warn("chrome.storage.sync not available");
        return;
      }

      chrome.storage.sync.get([STORAGE_KEY], (result) => {
        if (Array.isArray(result[STORAGE_KEY])) {
          items = result[STORAGE_KEY];
        } else {
          items = [];
        }
        renderList();
      });
    }

    function saveItems() {
      if (!chrome || !chrome.storage || !chrome.storage.sync) return;
      chrome.storage.sync.set({ [STORAGE_KEY]: items });
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

    // Minimise / maximise behaviour
    let collapsed = false;
    toggleBtn.addEventListener("click", () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? "none" : "flex";
      toggleBtn.textContent = collapsed ? "+" : "–";
    });

    // Initial load
    loadItems();
  })();
}
