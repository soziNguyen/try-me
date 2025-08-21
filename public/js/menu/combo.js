$(function () {

    let table
    let menuItem = []
  
    Promise.all([
      fetchData('menu/get/active')
    ])
    .then(([items]) => {
      menuItem = items
      initDataTable()
    })
    .catch(err => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })
    // Render dataTable
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#comboTableBody').offset().top - 100) / 71)
    if (!showList.includes(numRows)) {
      showList.push(numRows)
    }
    showList.sort((a, b) => a - b)
    
    function initDataTable () {
      table = $('#comboTable').DataTable({
        dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
        serverSide: true,
        processing: true,
        autoWidth: false,
        scrollX: true,
        order: [],
        ajax: {
          url: '/api/menu/combos',
          method: 'GET'
        },
        lengthMenu: [showList, showList],
        language: {
          search: '',
          searchPlaceholder: 'Tìm kiếm',
          lengthMenu: `_MENU_ combo mỗi trang`,
          info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ combo',
          infoEmpty: 'Không có bản ghi nào',
          infoFiltered: '(được lọc từ tổng _MAX_ combo)',
          zeroRecords: 'Không tìm thấy kết quả phù hợp',
          emptyTable: 'Không có dữ liệu trong bảng'
        },
        pageLength: numRows,
        columns: [
          {
            data: null,
            orderable: false,
            className: 'text-center',
            render: (data, type, row) =>
              `<input type="checkbox" class="comboCheckbox" data-id="${row._id}">`
          },
          {
            data: 'sku',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<span>${data || ''}</span>`
              }
              return data
            }
          },
          {
            data: 'name',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<span>${data || ''}</span>`
              }
              return data
            }
          },
          {
            data: 'image',
            orderable: false,
            className: 'image-cell',
            render: (data) => {
              const imgSrc = data || ''
              return `<img src="${imgSrc}" alt="Ảnh" class="combo-image">`
            }
          },
          {
            data: 'items',
            className: 'text-start px-1',
            title: 'Nguyên liệu',
            render: items => {
              if (!Array.isArray(items) || items.length === 0) return ''
              const names = items.map(it => it.menuItem?.name).filter(Boolean)
              const uniqueNames = new Set(names)
              
              if (uniqueNames.size === 0) return ''
              const nameLengths = [...uniqueNames]
              const firstThree = nameLengths.slice(0, 3).join(', ')
              const more = nameLengths.length > 3 ? '...' : ''
              return `<span title="${names.join('\n')}">${firstThree} ${more}</span>`
            }
          },
          {
            data: 'price',
            render: (data, type, row) => {
              if (type === 'display') {
                const price = parseFloat(data) || 0;
                const formatted = price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
                return `<span>${formatted}</span>`;
              }
              return data;
            }
          },
          {
            data: 'note',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<span>${data || ''}</span>`
              }
              return data
            }
          },
          {
            data: 'createdBy',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<span>${data || ''}</span>`
              }
              return data
            }
          },
          {
            data: 'createdAt',
            render: (data, type, row) => {
              if (type === 'display') {
                const dt = new Date(data)
                const dateStr = dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                return `<span>${dateStr} ${timeStr}</span>`
              }
              return data
            }
          }
        ],
        rowCallback: function(row, data) {
          // Tag row with data-id for update
          $(row).attr('data-id', data._id)
        },
        initComplete: function () {
          $('.right-group').html(`
            <div class="btn-group flex-wrap">
              <button class="btn btn-outline-danger me-2" id="deleteComboBtn">
              <i class="bi bi-trash"></i> Xóa
              </button>
              <button class="btn btn-outline-success" id="addComboBtn">
              <i class="bi bi-plus-circle"></i> Thêm
              </button>
            </div>
          `)
        }
      })

      if ($('#comboFormContainer').hasClass('d-none')) {
        hideForm();
      } else {
        showForm();
      }

      // =======================================================
      // EVENT HANDLER
      handlerDeleteEvent('#comboTable', '#deleteComboBtn', 'comboCheckbox', 'menu/combo')
      initTableCheckboxEvents('#comboTable', 'comboCheckbox')

      $('#comboTable_wrapper').on('click', '#addComboBtn', function () {
        const $form = $('#comboForm')
        $('#comboFormContainer').removeClass('d-none')
        $form[0].reset()
        $('#itemTableBody').empty()
        $('#formTitle').text('Thêm Combo mới')
        $form.data('mode', 'create')
        $form.removeData('comboId')
        showForm()
      })

      $('#comboTable tbody').on('click', 'tr', function (e) {
        if ($(e.target).is('input[type="checkbox"], tbody td:first-child')) return
        const data = table.row(this).data()
        if (!data) return
    
        const $form = $('#comboForm')
        $('#comboFormContainer').removeClass('d-none')
        $('#formTitle').text('Cập nhật Combo')
    
        // Gán dữ liệu vào form
        $form.find('[name="sku"]').val(data.sku || '')
        $form.find('[name="name"]').val(data.name || '')
        $form.find('[name="price"]').val(data.price || '')
        $form.find('[name="note"]').val(data.note || '')
    
        // Items
        const $itemBody = $('#itemTableBody')
        $itemBody.empty()
        if (Array.isArray(data.items)) {
          data.items.forEach(it => {
            const options = menuItem.map(o => `
                <option value="${o._id}" ${o._id === it.menuItem?._id ? 'selected' : ''}>${o.name}</option>
            `).join('')

            const $row = $(`
              <tr>
                <td>
                  <select class="form-select" name="menuItem">
                    <option value="">— Chọn món —</option>
                    ${options}
                  </select>
                </td>
                <td><input type="number" class="form-control" name="quantity" value="${it.quantity || 1}"></td>
                <td class="text-center">
                  <button 
                    type="button" 
                    class="btn btn-outline-danger btn-sm removeItemRow">
                      <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `)
            $itemBody.append($row)
            initSelect2($row.find('select[name="menuItem"]'))
          })
        }
    
        $form.data('mode', 'update')
        $form.data('comboId', data._id)
        showForm()
    })

    $('#comboForm').on('submit', function(e) {
      e.preventDefault()
      const $form = $(this)
      const mode = $form.data('mode')
      const comboId = $form.data('comboId')
  
      // Lấy dữ liệu form
      const sku = $form.find('[name="sku"]').val()
      const name = $form.find('[name="name"]').val()
      const price = parseFloat($form.find('[name="price"]').val())
      const note = $form.find('[name="note"]').val()
  
      // Lấy items
      const items = []
      $('#itemTableBody tr').each(function() {
          const menuItem = $(this).find('[name="menuItem"]').val()
          const quantity = parseFloat($(this).find('[name="quantity"]').val())
          if (menuItem && quantity > 0) {
              items.push({ menuItem, quantity })
          }
      })
  
      if (!name || !items.length || isNaN(price)) {
          toastr.error('Vui lòng điền đầy đủ thông tin')
          return
      }
  
      // URL và method
      let url = '/api/menu/combo/create'
      if (mode === 'update') {
          url = `/api/menu/combo/update/${comboId}`
      }
  
      $.ajax({
          url,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ sku, name, items, price, note }),
          success: function(res) {
              if (res.success) {
                  toastr.success(res.message)
                  table.ajax.reload(null, false) // reload DataTable
                  $form[0].reset()
                  $('#itemTableBody').empty()
                  $('#comboFormContainer').addClass('d-none')
              } else {
                  toastr.error(res.message || 'Lỗi')
              }
          },
          error: function(err) {
            toastr.error(err.responseJSON?.message || 'Lỗi server')
          }
      })
  })
  $('#addItemRow').on('click', function() {
    const options = menuItem.map(o => `
        <option value="${o._id}">${o.name}</option>
      `).join('')
  
    const rowHtml = `
      <tr>
        <td>
          <select class="form-select" name="menuItem">
            <option value="">— Chọn món —</option>
            ${options}
          </select>
        </td>
        <td><input type="number" class="form-control" name="quantity" min="1" step="1" value="1"></td>
        <td class="text-center">
          <button 
            type="button" 
            class="btn btn-outline-danger btn-sm removeItemRow">
              <i class="bi bi-trash"></i> 
          </button>
        </td>
      </tr>
    `
  
    const $row = $(rowHtml)
    $('#itemTableBody').append($row)
  
    initSelect2($row.find('select[name="menuItem"]'))
  })

  // Xóa item
  $('#itemTableBody').on('click', '.removeItemRow', function() {
      $(this).closest('tr').remove()
  })
  }
  $('#comboForm').on('click', '#btnCancel', function (e) {
    e.preventDefault()
    if ($('#comboFormContainer').hasClass('d-none')) {
      showForm()
    } else {
      hideForm()
    }
  })

  function showForm() {
    $('#tableContainer').removeClass('col-md-12').addClass('col-md-7');
    $('#formContainer').removeClass('d-none').addClass('col-md-5');
    $('#comboFormContainer').removeClass('d-none');
  
    setTimeout(() => {
      if (typeof table !== 'undefined' && table) {
        try { table.columns.adjust().draw(false); } catch(e) {  }
      }
    }, 150);
  }
  
  function hideForm() {
    $('#tableContainer').removeClass('col-md-7').addClass('col-md-12');
    $('#comboFormContainer').addClass('d-none');
    $('#formContainer').addClass('d-none').removeClass('col-md-5');
  
    setTimeout(() => {
      if (typeof table !== 'undefined' && table) {
        try { table.columns.adjust().draw(false); } catch(e) {  }
      }
    }, 150);
  }
})