class MembersIndex {
  constructor() {
    this.tableBody = document.querySelector("#members-table-body tbody");
    this.card = document.querySelector(".members-card");
    this.tooltipDiv = null;

    this.users = [];
    this.currentPage = 1;
    this.pageSize = 5;

    this.pageSizeSelect = document.getElementById("page-size-select");
    this.paginationControls = document.getElementById("pagination-controls");

    this.init();
  }

  async init() {
    this.users = await this.fetchUsers();

    this.createTooltip();
    this.renderPage();

    this.pageSizeSelect.addEventListener("change", () => {
      this.pageSize = parseInt(this.pageSizeSelect.value);
      this.currentPage = 1;
      this.renderPage();
    });
  }

  async fetchUsers() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      return data; // assumes API returns array of users
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  renderPage() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageUsers = this.users.slice(startIndex, endIndex);

    this.renderRows(pageUsers);
    this.renderPaginationControls();
  }

  renderRows(users) {
    this.tableBody.innerHTML = '';
    users.forEach((u) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
                <td class="text-center">
                    <img src="${u.picture}" 
                         alt="${u.name}" 
                         class="rounded-circle" 
                         width="32" height="32" 
                         style="cursor:pointer; object-fit:cover;"
                         data-name="${u.name}" 
                         data-picture="${u.picture}">
                </td>
                <td class="align-middle">${u.name || ''}</td>
                <td class="align-middle"><a href="/Members/Edit/${u.id}">Edit</a></td>
            `;
      this.tableBody.appendChild(tr);
    });

    this.addHoverTooltip();
  }

  renderPaginationControls() {
    this.paginationControls.innerHTML = '';
    const totalPages = Math.ceil(this.users.length / this.pageSize);
    const maxVisiblePages = 7;

    const createPageItem = (text, page, disabled = false, active = false) => {
      const li = document.createElement('li');
      li.className = `page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
      if (!disabled) {
        li.addEventListener('click', e => {
          e.preventDefault();
          this.currentPage = page;
          this.renderPage();
        });
      }
      return li;
    };

    // First & Prev
    this.paginationControls.appendChild(createPageItem('<<', 1, this.currentPage === 1));
    this.paginationControls.appendChild(createPageItem('<', Math.max(1, this.currentPage - 1), this.currentPage === 1));

    // Page window
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = start + maxVisiblePages - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      this.paginationControls.appendChild(createPageItem(i, i, false, i === this.currentPage));
    }

    // Next & Last
    this.paginationControls.appendChild(createPageItem('>', Math.min(totalPages, this.currentPage + 1), this.currentPage === totalPages));
    this.paginationControls.appendChild(createPageItem('>>', totalPages, this.currentPage === totalPages));
  }

  createTooltip() {
    if (!this.tooltipDiv) {
      this.tooltipDiv = document.createElement('div');
      this.tooltipDiv.style.position = 'absolute';
      this.tooltipDiv.style.background = 'white';
      this.tooltipDiv.style.border = '1px solid #ccc';
      this.tooltipDiv.style.borderRadius = '8px';
      this.tooltipDiv.style.padding = '5px';
      this.tooltipDiv.style.display = 'none';
      this.tooltipDiv.style.zIndex = 9999;
      this.tooltipDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      document.body.appendChild(this.tooltipDiv);
    }
  }

  addHoverTooltip() {
    const imgs = document.querySelectorAll("#members-table-body img");
    imgs.forEach(img => {
      img.addEventListener('mouseenter', () => {
        const src = img.dataset.picture;
        const name = img.dataset.name;

        const cardRect = this.card.getBoundingClientRect();
        const maxTooltipWidth = cardRect.width - 20;
        const maxTooltipHeight = Math.min(cardRect.height - 20, 150);

        // Tooltip content
        this.tooltipDiv.innerHTML = `
                <img src="${src}" 
                     style="
                        max-width:${maxTooltipWidth}px; 
                        max-height:${maxTooltipHeight}px; 
                        object-fit:cover; 
                        border-radius:8px;">
                <div style="text-align:center; margin-top:5px;">${name}</div>
            `;
        this.tooltipDiv.style.display = 'block';
      });

      img.addEventListener('mouseleave', () => {
        this.tooltipDiv.style.display = 'none';
      });

      img.addEventListener('mousemove', e => {
        const tooltipRect = this.tooltipDiv.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        let left = e.pageX + 10;  // default: right of cursor
        let top = e.pageY + 10;   // default: below cursor

        // Smart horizontal positioning
        if (left + tooltipRect.width > scrollX + window.innerWidth) {
          left = e.pageX - tooltipRect.width - 10;
        }
        if (left < scrollX) {
          left = scrollX + 5;
        }

        // Smart vertical positioning
        if (top + tooltipRect.height > scrollY + window.innerHeight) {
          top = e.pageY - tooltipRect.height - 10;
        }
        if (top < scrollY) {
          top = scrollY + 5;
        }

        this.tooltipDiv.style.left = left + 'px';
        this.tooltipDiv.style.top = top + 'px';
      });
    });
  }
}

// Initialize after DOM loaded
document.addEventListener('DOMContentLoaded', () => new MembersIndex());
