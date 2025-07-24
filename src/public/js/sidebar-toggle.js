document.querySelectorAll('button[id="toggleSidebar"]').forEach(btn => {
    btn.addEventListener('click', () => {
    const layout = btn.closest('.admin__layout, .staff__layout');
    if (!layout) return;
    const sidebar = layout.querySelector('[id$="__sidebar"]');

     if (window.innerWidth <= 991) {
      sidebar.classList.toggle('show-mobile');
      sidebar.classList.remove('collapsed');
    } else {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.remove('show-mobile');
    }
    });
});

const logOutBtn = document.getElementById("logOut");

if (logOutBtn) {
  logOutBtn.addEventListener("click", async () => {
    try {
      const result = await ajax("/api/users/logout", {}, "POST");
      if (result) {
        toastr.success("Logged out successfully");
        setTimeout(() => (window.location.href = "/login"), 1000);
      }
    } catch (error) {
      toastr.error(error.message);
    }
  });
}