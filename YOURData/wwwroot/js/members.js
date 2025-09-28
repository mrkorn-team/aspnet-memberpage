class MembersIndex {
  constructor() {
    this.tableBody = document.querySelector("#members-table-body tbody");
    this.card = document.querySelector(".members-card");

    this.tooltipDiv = null;
    this.tooltipImg = null;
    this.tooltipName = null;

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
    this.initCustomSelect(this.pageSizeSelect); // integrate custom select
    this.renderPage();

    this.pageSizeSelect?.addEventListener("change", () => {
      this.pageSize = parseInt(this.pageSizeSelect.value);
      this.currentPage = 1;
      this.renderPage();
    });
  }

  async fetchUsers() {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      return data; // expects array of users
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
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';
    users.forEach(u => {
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

      // Preload big photo for smooth hover
      new Image().src = u.picture;
    });

    this.addHoverTooltip();
  }

  renderPaginationControls() {
    if (!this.paginationControls) return;
    this.paginationControls.innerHTML = '';
    const totalPages = Math.ceil(this.users.length / this.pageSize);
    const maxVisiblePages = 7;

    const createPageItem = (text, page, disabled = false, active = false) => {
      const li = document.createElement('li');
      li.className = `page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
      li.innerHTML = `<a class="page-link" href="#"><span>${text}</span></a>`;
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
    this.paginationControls.appendChild(createPageItem('«', 1, this.currentPage === 1));
    this.paginationControls.appendChild(createPageItem('‹', Math.max(1, this.currentPage - 1), this.currentPage === 1));

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
    this.paginationControls.appendChild(createPageItem('›', Math.min(totalPages, this.currentPage + 1), this.currentPage === totalPages));
    this.paginationControls.appendChild(createPageItem('»', totalPages, this.currentPage === totalPages));
  }

  createTooltip() {
    if (!this.tooltipDiv) {
      this.tooltipDiv = document.createElement('div');
      this.tooltipDiv.id = 'member-tooltip';
      this.tooltipDiv.setAttribute('role', 'tooltip');

      this.tooltipImg = document.createElement('img');
      this.tooltipDiv.appendChild(this.tooltipImg);

      this.tooltipName = document.createElement('div');
      this.tooltipDiv.appendChild(this.tooltipName);

      document.body.appendChild(this.tooltipDiv);
    }
  }

  addHoverTooltip() {
    const imgs = document.querySelectorAll("#members-table-body img");
    let fadeOutTimeout = null;

    imgs.forEach(img => {
      img.setAttribute('aria-describedby', 'member-tooltip');
      img.setAttribute('tabindex', '0'); // allow keyboard focus

      const showTooltip = (e) => {
        const src = img.dataset.picture;
        const name = img.dataset.name;

        const cardRect = this.card.getBoundingClientRect();
        const maxTooltipWidth = cardRect.width - 20;
        const maxTooltipHeight = Math.min(cardRect.height - 20, 150);

        if (fadeOutTimeout) {
          clearTimeout(fadeOutTimeout);
          fadeOutTimeout = null;
        }

        this.tooltipImg.src = src;
        this.tooltipImg.style.maxWidth = maxTooltipWidth + 'px';
        this.tooltipImg.style.maxHeight = maxTooltipHeight + 'px';
        this.tooltipName.textContent = name;

        this.positionTooltip(e);
        this.tooltipDiv.classList.add('show');
      };

      const hideTooltip = () => {
        fadeOutTimeout = setTimeout(() => {
          this.tooltipDiv.classList.remove('show');
        }, 80);
      };

      img.addEventListener('mouseenter', showTooltip);
      img.addEventListener('mouseleave', hideTooltip);
      img.addEventListener('focus', showTooltip);
      img.addEventListener('blur', hideTooltip);
      img.addEventListener('mousemove', (e) => {
        if (fadeOutTimeout) {
          clearTimeout(fadeOutTimeout);
          fadeOutTimeout = null;
        }
        this.positionTooltip(e);
      });
    });
  }

  positionTooltip(e) {
    const tooltipRect = this.tooltipDiv.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = e.pageX + 10;
    let top = e.pageY + 10;

    if (left + tooltipRect.width > scrollX + window.innerWidth) {
      left = e.pageX - tooltipRect.width - 10;
    }
    if (left < scrollX) left = scrollX + 5;

    if (top + tooltipRect.height > scrollY + window.innerHeight) {
      top = e.pageY - tooltipRect.height - 10;
    }
    if (top < scrollY) top = scrollY + 5;

    this.tooltipDiv.style.left = left + 'px';
    this.tooltipDiv.style.top = top + 'px';
  }

  // =======================
  // Custom Select Integration
  // =======================
  initCustomSelect(selectEl) {
    if (!selectEl) return;
    const options = Array.from(selectEl.options);
    const container = document.createElement('div');
    container.className = 'custom-select';

    const toggle = document.createElement('div');
    toggle.className = 'custom-select-toggle';
    toggle.tabIndex = 0;

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    container.appendChild(toggle);
    container.appendChild(dropdown);
    selectEl.style.display = 'none';
    selectEl.parentNode.insertBefore(container, selectEl);

    const buildOptions = () => {
      dropdown.innerHTML = '';
      options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'custom-select-option';
        div.textContent = opt.textContent;
        if (opt.selected) div.classList.add('selected');

        div.tabIndex = 0;
        div.addEventListener('click', () => selectOption(opt, div));
        div.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectOption(opt, div);
          }
        });

        dropdown.appendChild(div);
      });
    };

    const updateToggle = () => {
      const selected = options.find(o => o.selected);
      toggle.textContent = selected ? selected.textContent : 'Select...';
    };

    const selectOption = (opt, div) => {
      options.forEach(o => o.selected = false);
      opt.selected = true;
      dropdown.querySelectorAll('.custom-select-option').forEach(d => d.classList.remove('selected'));
      div.classList.add('selected');
      updateToggle();
      container.classList.remove('open');
      selectEl.dispatchEvent(new Event('change'));
    };

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      container.classList.toggle('open');
    });

    toggle.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        container.classList.toggle('open');
        const firstOption = dropdown.querySelector('.custom-select-option');
        firstOption && firstOption.focus();
      }
      if (e.key === 'Escape') {
        container.classList.remove('open');
      }
    });

    document.addEventListener('click', e => {
      if (!container.contains(e.target)) container.classList.remove('open');
    });

    buildOptions();
    updateToggle();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new MembersIndex());
