class MembersIndex {
  constructor() {
    this.tableBody = document.querySelector("#members-table tbody");
    this.card = document.querySelector(".card");
    this.tooltipDiv = null;
    this.init();
  }

  async init() {
    const users = await this.fetchUsers();
    this.render(users);
    this.createTooltip();
  }

  async fetchUsers() {
    try {
      const res = await fetch('/api/members');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  render(users) {
    this.tableBody.innerHTML = '';
    users.forEach((u, index) => {
      const tr = document.createElement('tr');

      // alternating row colors
      const bgColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';

      tr.innerHTML = `
                <td>
                    <img src="${u.picture}" 
                         alt="${u.name}" 
                         class="rounded-circle" 
                         width="32" height="32" 
                         style="cursor:pointer; object-fit:cover;"
                         data-name="${u.name}" 
                         data-picture="${u.picture}">
                </td>
                <td style="text-align:left;">${u.name || ''}</td>
                <td><a href="/Members/Edit/${u.id}">Edit</a></td>
            `;

      // apply background to td
      tr.querySelectorAll('td').forEach(td => td.style.backgroundColor = bgColor);

      this.tableBody.appendChild(tr);
    });

    this.addHoverTooltip();
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
    const imgs = document.querySelectorAll("#members-table img");
    imgs.forEach(img => {
      img.addEventListener('mouseenter', e => {
        const src = img.dataset.picture;
        const name = img.dataset.name;

        // Calculate max tooltip size based on card
        const cardRect = this.card.getBoundingClientRect();
        const maxTooltipWidth = cardRect.width - 20;
        const maxTooltipHeight = Math.min(cardRect.height - 20, 150);

        this.tooltipDiv.innerHTML = `
                    <img src="${src}" 
                         style="
                             max-width:${maxTooltipWidth}px; 
                             max-height:${maxTooltipHeight}px; 
                             object-fit:cover; 
                             border-radius:8px;">
                    <div style="text-align:center; margin-top:5px;">${name}</div>
                `;
        this.tooltipDiv.style.left = e.pageX + 10 + 'px';
        this.tooltipDiv.style.top = e.pageY + 10 + 'px';
        this.tooltipDiv.style.display = 'block';
      });

      img.addEventListener('mouseleave', () => {
        this.tooltipDiv.style.display = 'none';
      });

      img.addEventListener('mousemove', e => {
        this.tooltipDiv.style.left = e.pageX + 10 + 'px';
        this.tooltipDiv.style.top = e.pageY + 10 + 'px';
      });
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new MembersIndex());
