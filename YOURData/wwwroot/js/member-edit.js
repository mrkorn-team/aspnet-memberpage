// wwwroot/js/member-edit.js
// Requires Bootstrap 5.3.8 tooltip
(() => {
  "use strict";

  // Utility: show bootstrap tooltip (for photo preview)
  function refreshTooltip(el, url) {
    el.setAttribute("data-bs-toggle", "tooltip");
    el.setAttribute("data-bs-placement", "right");
    el.setAttribute("data-bs-html", "true");
    el.setAttribute("title", `<img src="${url}" style="width:150px;height:auto;" />`);

    // Dispose old tooltip if exists
    let tooltip = bootstrap.Tooltip.getInstance(el);
    if (tooltip) {
      tooltip.dispose();
    }
    new bootstrap.Tooltip(el);
  }

  // Utility: validate file client-side
  async function validateFile(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File too large (> 5 MB).");
    }

    // Check dimensions
    const img = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Invalid image file."));
        image.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Unable to read image."));
      reader.readAsDataURL(file);
    });

    if (img.height < 160) {
      throw new Error("Image height must be at least 160px.");
    }
    return true;
  }

  // Toggle edit mode for a row
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
    const fileInput = row.dataset.pendingFile ? row.dataset.pendingFile : null;

    const formData = new FormData();
    formData.append("id", userId);
    formData.append("name", name);
    if (fileInput) {
      formData.append("file", fileInput);
    }

    try {
      const resp = await fetch("/members/edit", {
        method: "POST",
        body: formData
      });
      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.error || "Save failed.");
      }

      // Update row with new values
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
    const nameField = row.querySelector(".member-name");
    const editBtn = row.querySelector(".edit-btn");
    const saveBtn = row.querySelector(".save-btn");
    const cancelBtn = row.querySelector(".cancel-btn");

    // Store originals
    row.dataset.originalName = nameField.value;
    row.dataset.originalAvatar = avatar.src;

    // Tooltip init
    refreshTooltip(avatar, avatar.src);

    // Edit button
    editBtn.addEventListener("click", () => enterEditMode(row));

    // Cancel button
    cancelBtn.addEventListener("click", () => exitEditMode(row, true));

    // Save button
    saveBtn.addEventListener("click", () => handleSave(row));

    // Click avatar to pick file
    avatar.addEventListener("click", () => {
      if (!row.classList.contains("editing")) return;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await validateFile(file);
          const url = URL.createObjectURL(file);
          avatar.src = url;
          refreshTooltip(avatar, url);
          row.dataset.pendingFile = file;
        } catch (err) {
          alert(err.message);
        }
      };
      fileInput.click();
    });

    // Drag/drop image anywhere in row
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
        const url = URL.createObjectURL(file);
        avatar.src = url;
        refreshTooltip(avatar, url);
        row.dataset.pendingFile = file;
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".member-row").forEach(bindRow);
  });

})();
