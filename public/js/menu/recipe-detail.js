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
        fetchData('menu/get/active'),
        fetchData('inventory/ingredient/all'),
        recipeId
            ? fetchData(`menu/recipe/${recipeId}`)
            : Promise.resolve(null)
    ])
    .then(([menus, ings, recipeRes]) => {
        menuItems = menus
        ingredients = ings
        const menuOptions = menuItems.map(m => `<option value="${m._id}">${m.name}</option>`).join('')
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
    .catch(err => {
        console.error(err)
        toastr.error("Không thể load dữ liệu cần thiết")
    })

    function addNewItem(item = {}, counter = null) {
        const rowIndex = counter || (++itemCounter)

        const ingredientOptions = ingredients.map(i =>
            `<option value="${i._id}" ${item.ingredient?._id === i._id ? 'selected' : ''}>${i.name}</option>`
        ).join('')

        const unitOptions = units.map(u =>
            `<option value="${u}" ${item.unit === u ? 'selected' : ''}>${u}</option>`
        ).join('')

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
    }

    function populateForm(recipe) {
        $('#menuItem').val(recipe.menuItem?._id || "").trigger('change')
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

        const recipeData = {
            menuItem: $('#menuItem').val(),
            note: $('#note').val(),
            items: []
        }

        $('#itemsTableBody tr').each(function () {
            const ingredient = $(this).find('select[name*="[ingredient]"]').val()
            const quantity = parseFloat($(this).find('input[name*="[quantity]"]').val())
            const unit = $(this).find('select[name*="[unit]"]').val()

            if (ingredient && quantity && unit) {
                recipeData.items.push({ ingredient, quantity, unit })
            }
        })

        if (!recipeData.menuItem) {
            toastr.error('Vui lòng chọn món ăn')
            return
        }

        if (recipeData.items.length === 0) {
            toastr.error('Công thức phải có ít nhất 1 nguyên liệu')
            return
        }

        const url = recipeId
            ? `/api/menu/recipe/update/${recipeId}`
            : '/api/menu/recipe/create'

        $.ajax({
            url,
            method: 'POST',
            contentType: 'application/json',
            
            data: JSON.stringify(recipeData),
            success(res) {
                if (res.success) {
                    toastr.success(res.message || 'Lưu công thức thành công')
                    if (!recipeId && res.data?._id) {
                        recipeId = res.data._id
                    }
                } else {
                    toastr.error(res.message || 'Có lỗi xảy ra')
                }
            },
            error(xhr) {
                toastr.error(xhr.responseJSON?.message || 'Lỗi hệ thống')
            }
        })
    }

    $('#recipe-form').on('submit', saveRecipe)
    $(document).on('click', '#add-ingredient', () => addNewItem())
    $(document).on('click', '.remove-item-btn', function () {
        $(this).closest('tr').remove()
    })
})
