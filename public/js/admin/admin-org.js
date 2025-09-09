$(function () {
  const $selections = $('#organization-selection')
  loadOrganizations($selections)

  $selections.on('change', function () {
    const orgId = $(this).val()
    if (orgId) {
      $.ajax({
        url: '/api/admin/set-org',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ orgId }),
        success: function (res) {
          if (res.ok) {
            window.location.href = `/org/${orgId}/dashboard`
          }
        }
      })
    }
  })
})
