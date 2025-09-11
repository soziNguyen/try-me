$(function () {
  const $selections = $('#organization-selection')
  const csrfToken = $('#_csrf').val()
  loadOrganizations($selections)

  $selections.on('change', function () {
    const orgId = $(this).val()
    if (orgId) {
      $.ajax({
        url: '/api/admin/set-org',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ orgId }),
        headers: { 'x-csrf-token': csrfToken },
        success: function (res) {
          if (res.ok) {
            window.location.href = `/org/${orgId}/dashboard`
          }
        }
      })
    }
  })
})
