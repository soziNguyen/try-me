document.addEventListener("DOMContentLoaded", () => {
  const toggleBtns = document.querySelectorAll('#toggleSidebar');
  const sidebars = document.querySelectorAll('#admin__sidebar, #staff__sidebar');
  const layoutSelector = '.admin__layout, .staff__layout';

  function isMobile() {
    return window.innerWidth <= 991;
  }

  // Toggle sidebar (collapsed/show)
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const layout = btn.closest(layoutSelector);
      if (!layout) return;

      const sidebar = layout.querySelector('[id$="__sidebar"]');
      if (!sidebar) return;

      if (isMobile()) {
        sidebar.classList.toggle('show');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  });

  // Reset khi resize
  function handleResponsiveSidebar() {
    sidebars.forEach((sidebar) => {
      if (isMobile()) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.remove('show');
      }
    });
  }
  handleResponsiveSidebar();
  window.addEventListener('resize', handleResponsiveSidebar);

  // Click ngoài để ẩn sidebar trên mobile
  document.addEventListener("click", (event) => {
    if (!isMobile()) return;

    sidebars.forEach((sidebar) => {
      const layout = sidebar.closest(layoutSelector);
      const toggleBtn = layout.querySelector('#toggleSidebar');
      const clickedInside = sidebar.contains(event.target);
      const clickedToggle = toggleBtn.contains(event.target);

      if (!clickedInside && !clickedToggle) {
        sidebar.classList.remove('show');
      }
    });
  });

  // Log out button
  const logOutBtn = document.getElementById("logOut");
  if (logOutBtn) {
    logOutBtn.addEventListener("click", async () => {
      try {
        const result = await ajax("/api/users/logout", {}, "POST");
        if (result) {
          toastr.success("Đăng xuất thành công");
          setTimeout(() => (window.location.href = "/login"), 1000);
        }
      } catch (error) {
        toastr.error(error.message);
      }
    });
  }

  // — tooltip code start —
  const tooltip = document.createElement('div');
  tooltip.className = 'sidebar-tooltip';
  document.body.appendChild(tooltip);
  let hideTimer;

  function showTooltip(el) {
    clearTimeout(hideTimer);
    const text = el.dataset.tooltip || el.textContent.trim();
    if (!text) return;
    tooltip.textContent = text;
    tooltip.style.opacity = '1';

    const rect = el.getBoundingClientRect();
    let top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
    let left = rect.right + 8;
    if (left + tooltip.offsetWidth > window.innerWidth) {
      left = rect.left - tooltip.offsetWidth - 8;
    }
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
    hideTimer = setTimeout(() => {
      tooltip.textContent = '';
    }, 150);
  }

  const ttSelector = '[id$="__sidebar"].collapsed ul > li a, [id$="__sidebar"].collapsed .accordion-button';

  document.addEventListener('mouseover', e => {
    const el = e.target.closest(ttSelector);
    if (el) showTooltip(el);
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(ttSelector)) hideTooltip();
  });
  document.addEventListener('focusin', e => {
    const el = e.target.closest(ttSelector);
    if (el) showTooltip(el);
  });
  document.addEventListener('focusout', e => {
    if (e.target.closest(ttSelector)) hideTooltip();
  });
  // — tooltip code end —

  // — flyout code start —
  let flyout;

  function ensureFlyout() {
    if (!flyout) {
      flyout = document.createElement('div');
      flyout.className = 'sidebar-flyout';
      flyout.style.display = 'none';
      document.body.appendChild(flyout);

      document.addEventListener('click', e => {
        if (!flyout.contains(e.target) &&
            !e.target.closest('[id$="__sidebar"].collapsed .accordion-button')) {
          flyout.style.display = 'none';
        }
      });
    }
    return flyout;
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[id$="__sidebar"].collapsed .accordion-button');
    if (!btn) return;

    e.preventDefault();  // chặn bootstrap collapse mặc định

    const collapseId = btn.getAttribute('aria-controls');
    const body = document.querySelector(`#${collapseId} .accordion-body`);
    if (!body) return;

    const f = ensureFlyout();
    f.innerHTML = '';
    body.querySelectorAll('a').forEach(a => {
      const clone = a.cloneNode(true);
      clone.addEventListener('click', event => {
        event.preventDefault();
        window.location.href = clone.href;
      });
      f.appendChild(clone);
    });

    const rect = btn.getBoundingClientRect();
    f.style.top = `${rect.top}px`;
    f.style.left = `${rect.right + 4}px`;
    f.style.display = 'block';
  });
  // — flyout code end —

});