document.querySelectorAll('button[id="toggleSidebar"]').forEach(btn => {
    btn.addEventListener('click', () => {
    const layout = btn.closest('.admin__layout, .staff__layout');
    if (!layout) return;
    const sidebar = layout.querySelector('[id$="__sidebar"]');
    if (sidebar) sidebar.classList.toggle('collapsed');
    });
});

const userInfo = document.querySelector('.info');
userInfo.addEventListener('click', function () {
  const changePassword = document.createElement('span');
  changePassword.className = 'change-password';

  userInfo.append(changePassword)
})

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