document.addEventListener("DOMContentLoaded", () => {
  const toggleBtns = document.querySelectorAll('#toggleSidebar');
  const sidebars = document.querySelectorAll('#admin__sidebar, #staff__sidebar');
  const layoutSelector = '.admin__layout, .staff__layout';

  function isMobile() {
    return window.innerWidth <= 991;
  }

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
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

  document.addEventListener("click", (event) => {
    if (!isMobile()) return;

    sidebars.forEach((sidebar) => {
      const layout = sidebar.closest(layoutSelector);
      const toggleBtn = layout?.querySelector('#toggleSidebar');

      const clickedInsideSidebar = sidebar.contains(event.target);
      const clickedToggleBtn = toggleBtn?.contains(event.target);

      if (!clickedInsideSidebar && !clickedToggleBtn) {
        sidebar.classList.remove('show');
      }
    });
  });

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
});
