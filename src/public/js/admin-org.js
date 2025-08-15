$(function () {
    const $selections = $('#organization-selection')
    loadOrganizations($selections)

    $selections.on('change', function () {
        const orgId = $(this).val()
        
        if (!orgId) return
    })
})