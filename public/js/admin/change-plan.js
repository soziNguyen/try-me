document.addEventListener('DOMContentLoaded', async function () {
  const url = window.location.pathname.split('/')
  const organizationId = url[url.length - 2]
  const csrfToken = document.getElementById('_csrf').value
})
