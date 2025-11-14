document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notificationBtn').addEventListener('click', showNotificationModal)
})

function showNotificationModal() {
  showModal('notificationModal').show()
}
