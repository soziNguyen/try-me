$(function () {
  let menuItems = []
  let ingredients = []
  let units = []
  let recipeId = null
  let itemCounter = 0
  let recipe = null

  const urlPath = window.location.pathname.split('/')
  const url = urlPath[urlPath.length - 1]
  if (url) recipeId = url

  Promise.all([
    fetchData('menus/active'),
    fetchData('inventory/ingredient/active'),
    recipeId ? fetchData(`menu/recipe/${recipeId}`) : Promise.resolve(null)
  ])
    .then(([menus, ings, recipeRes]) => {
      const uniqueMenus = Array.from(
        new Map(menus.map((m) => [m.name.trim().toLowerCase(), m])).values()
      )

      const uniqueIngs = Array.from(
        new Map(ings.map((i) => [i.name.trim().toLowerCase(), i])).values()
      )

      menuItems = uniqueMenus
      ingredients = uniqueIngs

      const menuOptions = menuItems
        .map((m) => `<option value="${m._id}">${m.name}</option>`)
        .join('')

      $('#menuItem').html('<option value="">— Chọn món —</option>' + menuOptions)
      initSelect2($('#menuItem'), '— Chọn món —')

      if (recipeRes) {
        recipe = recipeRes.recipe
        units = recipeRes.units || []
        populateForm(recipe)
      } else {
        units = window.recipeUnits || []
        addNewItem()
      }
    })
    .catch((err) => {
      console.error(err)
      toastr.error('Không thể load dữ liệu cần thiết')
    })

  function addNewItem(item = {}, counter = null) {
    const rowIndex = counter || ++itemCounter

    const ingredientOptions = ingredients
      .map(
        (i) =>
          `<option value="${i._id}" ${item.ingredient?._id === i._id ? 'selected' : ''}>${i.name}</option>`
      )
      .join('')

    const unitOptions = units
      .map((u) => `<option value="${u}" ${item.unit === u ? 'selected' : ''}>${u}</option>`)
      .join('')

    const row = $(`
      <tr>
        <td>
          <select class="form-select form-select-sm select2-ingredient" name="items[${rowIndex}][ingredient]">
            <option value="">— Chọn nguyên liệu —</option>
            ${ingredientOptions}
          </select>
        </td>
        <td>
          <input type="number" class="form-control form-control-sm" name="items[${rowIndex}][quantity]" min="0" step="0.1" value="${item.quantity || ''}" placeholder="0">
        </td>
        <td>
          <select class="form-select form-select-sm select2-unit" name="items[${rowIndex}][unit]">
            <option value="">— Chọn đơn vị —</option>
            ${unitOptions}
          </select>
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-danger btn-sm remove-item-btn">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `)

    $('#itemsTableBody').append(row)
    initSelect2(row.find('.select2-ingredient'), '— Chọn nguyên liệu —')
    initSelect2(row.find('.select2-unit'), '— Chọn đơn vị —')
    $('#recipe-form button[type="submit"]').prop('disabled', false)
  }

  function populateForm(recipe) {
    $('#menuItem')
      .val(recipe.menuItem?._id || '')
      .trigger('change')
    $('#note').val(recipe.note || '')

    $('#itemsTableBody').empty()
    itemCounter = 0

    if (recipe.items && recipe.items.length > 0) {
      recipe.items.forEach((item, index) => addNewItem(item, index + 1))
      itemCounter = recipe.items.length
    } else {
      addNewItem()
    }
  }

  function saveRecipe(e) {
    e.preventDefault()
    const csrfToken = $('#_csrf').val()
    const submitBtn = $('#recipe-form button[type="submit"]')
    submitBtn.prop('disabled', true)

    const recipeData = {
      menuItem: $('#menuItem').val(),
      note: $('#note').val(),
      items: []
    }

    let hasError = false

    $('#itemsTableBody tr').each(function () {
      const ingredient = $(this).find('select[name*="[ingredient]"]').val()
      const quantityVal = $(this).find('input[name*="[quantity]"]').val()
      const unit = $(this).find('select[name*="[unit]"]').val()

      // Kiểm tra trạng thái row
      const allEmpty = !ingredient && !quantityVal && !unit
      const anyFilled = ingredient || quantityVal || unit

      // Nếu có data nhưng thiếu bất kỳ ô nào -> báo lỗi
      if (anyFilled && (!ingredient || !quantityVal || !unit)) {
        toastr.error('Mỗi dòng có dữ liệu phải nhập đủ nguyên liệu, số lượng và đơn vị')
        hasError = true
        return false // thoát each
      }

      // Nếu có đầy đủ dữ liệu -> push vào items
      if (!allEmpty) {
        recipeData.items.push({
          ingredient,
          quantity: parseFloat(quantityVal),
          unit
        })
      }
    })

    if (hasError) {
      submitBtn.prop('disabled', false)
      return
    }

    if (!recipeData.menuItem) {
      toastr.error('Vui lòng chọn món ăn')
      submitBtn.prop('disabled', false)
      return
    }

    if (recipeData.items.length === 0) {
      toastr.error('Công thức phải có ít nhất 1 nguyên liệu')
      submitBtn.prop('disabled', false)
      return
    }

    const url = recipeId ? `/api/menu/recipe/update/${recipeId}` : '/api/menu/recipe/create'

    $.ajax({
      url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(recipeData),
      headers: { 'x-csrf-token': csrfToken },
      success(res) {
        if (res.success) {
          toastr.remove()
          toastr.success(res.message || 'Lưu công thức thành công')
          submitBtn.prop('disabled', true)
          if (!recipeId && res.data?._id) {
            recipeId = res.data._id
          }
        } else {
          toastr.error(res.message || 'Có lỗi xảy ra')
          submitBtn.prop('disabled', false)
        }
      },
      error(xhr) {
        toastr.error(xhr.responseJSON?.message || 'Lỗi hệ thống')
        submitBtn.prop('disabled', false)
      }
    })
  }

  $('#recipe-form').on('submit', saveRecipe)
  $(document).on('click', '#add-ingredient', () => addNewItem())
  $(document).on('click', '.remove-item-btn', function () {
    $(this).closest('tr').remove()
  })
  $(document).on(
    'input change',
    '#recipe-form input, #recipe-form select, #recipe-form textarea',
    function () {
      $('#recipe-form button[type="submit"]').prop('disabled', false)
    }
  )
})
