(() => {
  "use strict";

  const API_LIST = "/members/list";
  const API_EDIT = "/members/edit";

  // ===========================
  // Utility functions
  // ===========================
  function refreshTooltip(el, url) {
    el.setAttribute("data-bs-toggle", "tooltip");
    el.setAttribute("data-bs-placement", "right");
    el.setAttribute("data-bs-html", "true");
    el.setAttribute("title", `<img src="${url}" style="width:150px;height:auto;" />`);

    let tooltip = bootstrap.Tooltip.getInstance(el);
    if (tooltip) tooltip.dispose();
    new bootstrap.Tooltip(el);
  }

  async function validateFile(file) {
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("File too large (>5MB).");

    const img = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Invalid image."));
        image.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Unable to read image."));
      reader.readAsDataURL(file);
    });

    if (img.height < 160) throw new Error("Image height must be at least 160px.");
    return true;
  }

  // ===========================
  // Row operations
  // ===========================
  function enterEditMode(row) {
    row.classList.add("editing");
    const avatar = row.querySelector(".member-avatar");
    avatar.classList.add("editing");

    const nameField = row.querySelector(".member-name");
    nameField.removeAttribute("readonly");
    nameField.focus();

    row.querySelector(".edit-btn").classList.add("d-none");
    row.querySelector(".save-btn").classList.remove("d-none");
    row.querySelector(".cancel-btn").classList.remove("d-none");
  }

  function exitEditMode(row, restore = true) {
    row.classList.remove("editing");
    const avatar = row.querySelector(".member-avatar");
    avatar.classList.remove("editing");

    const nameField = row.querySelector(".member-name");
    nameField.setAttribute("readonly", "true");

    if (restore) {
      nameField.value = row.dataset.originalName;
      avatar.src = row.dataset.originalAvatar;
      refreshTooltip(avatar, row.dataset.originalAvatar);
    }

    row.querySelector(".edit-btn").classList.remove("d-none");
    row.querySelector(".save-btn").classList.add("d-none");
    row.querySelector(".cancel-btn").classList.add("d-none");

    row.dataset.pendingFile = "";
  }

  async function handleSave(row) {
    const userId = row.dataset.userId;
    const name = row.querySelector(".member-name").value.trim();
    const file = row.dataset.pendingFile ? row.dataset.pendingFile : null;

    const formData = new FormData();
    formData.append("id", userId);
    formData.append("name", name);
    if (file) formData.append("Picture", file);

    try {
      const resp = await fetch(API_EDIT, { method: "POST", body: formData });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Save failed.");

      row.dataset.originalName = result.name;
      row.dataset.originalAvatar = result.pictureUrl;

      const avatar = row.querySelector(".member-avatar");
      avatar.src = result.pictureUrl;
      refreshTooltip(avatar, result.pictureUrl);
      row.querySelector(".member-name").value = result.name;

      exitEditMode(row, false);
    } catch (err) {
      alert(err.message);
      exitEditMode(row, true);
    }
  }

  function bindRow(row) {
    const avatar = row.querySelector(".member-avatar");
    const editBtn = row.querySelector(".edit-btn");
    const saveBtn = row.querySelector(".save-btn");
    const cancelBtn = row.querySelector(".cancel-btn");
    const nameField = row.querySelector(".member-name");

    row.dataset.originalName = nameField.value;
    row.dataset.originalAvatar = avatar.src;

    refreshTooltip(avatar, avatar.src);

    editBtn.addEventListener("click", () => enterEditMode(row));
    cancelBtn.addEventListener("click", () => exitEditMode(row, true));
    saveBtn.addEventListener("click", () => handleSave(row));

    avatar.addEventListener("click", () => {
      if (!row.classList.contains("editing")) return;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await validateFile(file);
          avatar.src = URL.createObjectURL(file);
          refreshTooltip(avatar, avatar.src);
          row.dataset.pendingFile = file;
        } catch (err) { alert(err.message); }
      };
      input.click();
    });

    row.addEventListener("dragover", e => {
      if (row.classList.contains("editing")) e.preventDefault();
    });
    row.addEventListener("drop", async e => {
      if (!row.classList.contains("editing")) return;
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      try {
        await validateFile(file);
        avatar.src = URL.createObjectURL(file);
        refreshTooltip(avatar, avatar.src);
        row.dataset.pendingFile = file;
      } catch (err) { alert(err.message); }
    });
  }

  // ===========================
  // Render table rows from JSON
  // ===========================
  function renderRow(user) {
    const tr = document.createElement("tr");
    tr.classList.add("member-row");
    tr.dataset.userId = user.id;

    tr.innerHTML = `
      <td><img src="${user.pictureUrl}" alt="${user.name}" class="member-avatar" /></td>
      <td>${user.email}</td>
      <td><input type="text" value="${user.name}" readonly class="member-name form-control form-control-sm" /></td>
      <td>
          <button type="button" class="btn btn-sm btn-primary edit-btn">Edit</button>
          <button type="button" class="btn btn-sm btn-success save-btn d-none">Save</button>
          <button type="button" class="btn btn-sm btn-secondary cancel-btn d-none">Cancel</button>
      </td>
    `;

    bindRow(tr);
    return tr;
  }

  async function loadUsers() {
    try {
      const resp = await fetch(API_LIST);
      if (!resp.ok) throw new Error("Failed to load users.");
      const users = await resp.json();
      const tbody = document.querySelector("#members-table-body tbody");
      tbody.innerHTML = "";
      users.forEach(user => tbody.appendChild(renderRow(user)));
    } catch (err) {
      console.error(err);
      alert("Failed to load members.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => loadUsers());
})();
