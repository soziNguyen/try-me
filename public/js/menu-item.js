$(function () {

    let table
    let units = []
    let categories = []
  
    Promise.all([
      fetchData('menu/category/active'),
    ])
    .then(([cats]) => {
      categories = cats
      initDataTable()
    })
    .catch(err => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })
  
    // Render dataTable
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#menuTableBody').offset().top - 100) / 45)
    if (!showList.includes(numRows)) {
      showList.push(numRows)
    }
    showList.sort((a, b) => a - b)
  
    
    function initDataTable () {
      table = $('#menuTable').DataTable({
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
        // scrollX: true,
        order: [],
        ajax: {
          url: '/api/menu/get',
          method: 'GET'
        },
        lengthMenu: [showList, showList],
        language: {
          search: '',
          searchPlaceholder: 'Tìm kiếm',
          lengthMenu: `_MENU_ thực đơn mỗi trang`,
          info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ thực đơn',
          infoEmpty: 'Không có bản ghi nào',
          infoFiltered: '(được lọc từ tổng _MAX_ thực đơn)',
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
              `<input type="checkbox" class="menuCheckbox" data-id="${row._id}">`
          },
          {
            data: 'image',
            orderable: false,
            className: 'image-cell',
            render: (data) => {
              const imgSrc = data || ''
              return `<img src="${imgSrc}" alt="Ảnh" class="menu-image">`
            }
          },
          {
            data: 'name',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="sku" value="${data ?? ''}">`
              }
              return data
            }
          },
          {
            data: 'category',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data ?? ''}">`
              }
              return data
            }
          },
          {
            data: 'price',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<input type="number" class="form-control-plaintext text-center" value="${data ?? 0}" readonly>`
              }
              return data
            }
          },
          {
            data: 'description',
            render: (data, type, row) => {
              if (type === 'display') {
                const opts = units.map(unit => {
                  const selected = unit === data ? 'selected' : ''
                  return `<option value="${unit}" ${selected}>${unit}</option>`
                }).join('')
                return `
                  <select class="dataInput form-select form-select-sm" data-field="unit" data-id="${row._id}">
                    <option value="">— Chọn đơn vị —</option>
                    ${opts}
                  </select>`
              }
              return data
            }
          },
          {
            data: 'isActive',
            className: 'text-center',
            render: (data, type, row) => {
              if (type === 'display') {
                return `<input type="checkbox" class="dataInput form-check-input" data-field="isActive" data-id="${row._id}" ${data ? 'checked' : ''}>`
              }
              return data
            }
          }
        ],
        rowCallback: function(row, data) {
          // Tag row with data-id for update
          $(row).attr('data-id', data._id)
        },
        drawCallback: function (settings) {
          $('#menuTable select[data-field]').each(function () {
            const field = $(this).data('field')
            const placeholders = {
              category: '— Chọn danh mục —',
              unit: '— Chọn đơn vị —'
            }
            if (placeholders[field]) {
              $(this).select2({
                placeholder: placeholders[field],
                width: '100%'
              })
            }
          })
        },
        initComplete: function () {
          // const api = this.api()
          $('.right-group').html(`
            <div class="btn-group flex-wrap">
              <button class="btn btn-outline-danger me-2" id="deleteMenus">
              <i class="bi bi-trash"></i> Xóa
              </button>
              <button class="btn btn-outline-success" id="addMenu">
              <i class="bi bi-plus-circle"></i> Thêm
              </button>
            </div>
          `)
          // $(window).on('resize', function () {
          //   api.columns.adjust()
          // })
        }
      })
    
      // =======================================================
      // EVENT HANDLER
      handlerAddEvent('#menuTable', '#addMenu', 'menu')
      handlerDeleteEvent('#menuTable', '#deleteMenus', 'menuCheckbox', 'menu')
      handlerUpdateEvent('#menuTable', 'menu')
    
      initTableCheckboxEvents('#menuTable', 'menuCheckbox')
    }
  
    let cropper
    let currentImgCell
  
    // Khi click vào ảnh trong table
    $('#menuTable').on('click', '.menu-image', function () {
      currentImgCell = $(this).closest('td')
  
      // Tạo input file ẩn và trigger chọn file
      $('<input type="file" accept="image/*">')
        .on('change', function (e) {
          const file = e.target.files[0]
          if (!file) return
  
          const reader = new FileReader()
          reader.onload = function (event) {
            // Đổ ảnh vào img#imagePreview
            $('#imagePreview').attr('src', event.target.result)
  
            // Show modal
            const modalEl = document.getElementById('imageCropModal')
            const modal = new bootstrap.Modal(modalEl)
            modal.show()
  
            // Khi modal đã hiển thị hết animation, khởi tạo Cropper
            modalEl.addEventListener('shown.bs.modal', () => {
              if (cropper) {
                cropper.destroy()
              }
              cropper = new Cropper(
                document.getElementById('imagePreview'),
                {
                  aspectRatio: 1,
                  viewMode: 1,
                  autoCropArea: 1,
                }
              )
            }, { once: true })
          }
          reader.readAsDataURL(file)
        })
        .trigger('click')
    })
  
    // Khi nhấn nút Crop & Save
    $('#cropBtn').on('click', function () {
      if (!cropper) return
  
      cropper.getCroppedCanvas().toBlob(blob => {
        const formData = new FormData()
        formData.append('file', blob, 'cropped.jpg')
  
        // Upload file đã crop lên server
        $.ajax({
          url: '/api/upload',
          method: 'POST',
          data: formData,
          processData: false,
          contentType: false,
          success: res => {
            const imgUrl = '/' + res.file.path.replace(/\\/g, '/')
            const timestamp = new Date().getTime()
            // Update src ảnh trong table, thêm timestamp để bust cache
            currentImgCell.find('img').attr('src', `${imgUrl}?t=${timestamp}`)
  
            // Cập nhật trường image của bản ghi
            const row = currentImgCell.closest('tr')
            const id = row.data('id')
            if (id) {
              $.ajax({
                url: `/api/inventory/ingredient/update/${id}`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ image: imgUrl }),
                success: () => toastr.success('Cập nhật ảnh thành công'),
                error: () => toastr.error('Lỗi khi cập nhật ảnh'),
              })
            }
  
            // Đóng modal và destroy cropper
            bootstrap.Modal.getInstance(
              document.getElementById('imageCropModal')
            ).hide()
            cropper.destroy()
            cropper = null
          },
          error: () => toastr.error('Lỗi upload ảnh'),
        })
      }, 'image/jpeg')
    })
  })