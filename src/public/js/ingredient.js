$(function () {

  // Unit field
  let units = [];

  // Get Category lists for select
  let categories = [];
  $.ajax({
    url: '/api/inventory/categories',
    method: 'GET',
    success: function (res) {
      if (res.success) {
        categories = res.data
      } else {
        toastr.error("Không tải được dữ liệu danh mục nguyên liệu")
      }
    }, 
    error: function (error) {
      toastr.error("Có lỗi xảy ra khi tải dữ liệu danh mục")
    }
  })


  // Render dataTable
  let showList = [10, 25, 50, 100];
  const numRows = Math.floor(($(window).height() - $('#ingredientTableBody').offset().top - 100) / 45);
  if (!showList.includes(numRows)) {
    showList.push(numRows);
  }
  showList.sort((a, b) => a - b);
  const table = $('#ingredientTable').DataTable({
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
        url: '/api/inventory/ingredient',
        method: 'GET',
        dataSrc: function (res) {
          if (!res.data) return [];
          units = res.units || [];
          return res.data;
        }
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ nguyên liệu mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ nguyên liệu',
        infoFiltered: '(được lọc từ tổng _MAX_ nguyên liệu)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) => `<input type="checkbox" class="ingredientCheckbox" data-id="${row._id}">`
        },
        { data: 'image',
          orderable: false,
          className: 'image-cell',
          render: (data, type , row) => {
            const imgSrc = data || '';
            return `<img src="${imgSrc}" alt="Ảnh" class="ingredient-image">`;
          }
        },
        { data: 'name', 
          render: (data, type, row) => {
            if ( type === 'display' ) {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data}">`
            }
            return data;
          }
        },
        { data: 'unit',
          render: (data, type, row) => {
            if ( type === 'display' ) {
              const opts = units.map(unit => {
                const selected = unit === data ? 'selected' : '';
                return `<option value=${unit} ${selected}>${unit}</option>`
              }).join('');
              return `
              <select class="dataInput form-select form-select-sm"
                data-field="unit"
                data-id="${row._id}">
                <option value="">— Chọn đơn vị —</option>
                ${opts}
              </select>`
            }
            return data;
          }
        },
        { data: 'category._id',
          name: 'category.name',
          render: (data, type, row) => {
            if ( type === 'display' ) {
              const opts = categories.map(cat => {
                const sel = cat._id === (row.category?._id) ? 'selected' : '';
                return `<option value="${cat._id}"${sel}>${cat.name}</option>`
              }).join('');
              return `
              <select class="dataInput form-select form-select-sm"
                data-field="category"
                data-id="${row._id}">
                <option value="">— Chọn danh mục —</option>
                ${opts}
              </select>`;
            }
            return row.category?.name ?? '';
          }
        },
        { data: 'stock',
          render: (data, type, row) => {
            if ( type === 'display' ) {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="stock" value="${data}">`
            }
            return data;
          }
        },
        { data: 'note',
          render: (data, type, row) => {
            if ( type === 'display' ) {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="note" value="${data}">`
            }
            return data;
          }
        }
      ],
      rowCallback: function(row, data) {
        // Tag row with data-id for update
        $(row).attr('data-id', data._id);
      },
      initComplete: function () {
        // const api = this.api();
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteIngredientBtn">
            <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addIngredientBtn">
            <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `);
        // $(window).on('resize', function () {
        //   api.columns.adjust();
        // });
      }
    });

  // EVENT HANDLER
  const ingredientWrapper = $('#ingredientTable_wrapper');
  ingredientWrapper.on('click', '#addIngredientBtn', handlerAddEvent);
  ingredientWrapper.on('click', '#deleteIngredientBtn', handlerDeleteEvent);
  $('#ingredientTable tbody').on('change', '.dataInput', handlerUpdateEvent);

  // =======================================================
  // HANDLER ADD EVENT
  function handlerAddEvent () {
    const $btn = $(this);
    $btn.prop('disabled', true);
    $.ajax({
      url: '/api/inventory/ingredient/create',
      method: 'POST',
      contentType: 'application/json',
      success: function (res) {
        if (res.success) {
          toastr.success(res.message);
          table.ajax.reload(null, false);
        } else {
          toastr.error(res.message);
        }
      },
      error: function (xhr) {
        toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra');
      },
      complete: function () {
        $btn.prop('disabled', false);
      }
    })
  }

  // Click 'tr' event for checkbox
  $('#ingredientTable tbody').on('click', 'tr', function (e) {
    if ($(e.target).is('input[type=checkbox], img, input[type=text], .dataInput')) return;
    const checkbox = $(this).find('.ingredientCheckbox');
    checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');
  })

  // Handle Select All Checkbox
  ingredientWrapper.on('change', '#selectAll', function () {
    $('.ingredientCheckbox').prop('checked', this.checked);
  })

  // Sync Select All Checkbox
  $('#ingredientTable tbody').on('change', '.ingredientCheckbox', function () {
    const all = $('.ingredientCheckbox').length;
    const checked = $('.ingredientCheckbox:checked').length;
    $('#selectAll').prop('checked', all > 0 && all === checked);
  })

  // DELETE EVENT HANDLER
  function handlerDeleteEvent () {
    const $btn = $(this);
    $btn.prop('disabled', true);
    const selectedIds = $('.ingredientCheckbox:checked').map(function () {
      return $(this).data('id');
    }).get(); // .get() => get Array

    if (selectedIds.length === 0) {
      toastr.warning('Không có nguyên liệu nào được chọn để xóa');
      $btn.prop('disabled', false);
      return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} nguyên liệu không ?`)) {
      $btn.prop('disabled', false);
      return;
    }

    $.ajax({
      url: '/api/inventory/ingredient/deletes',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ ids: selectedIds }),
      success: function (res) {
        if (res.success) {
          toastr.success(res.message);
          table.ajax.reload(null, false);
          $('#selectAll').prop('checked', false);
        } else {
          toastr.error(res.message);
        }
      },
      error: function (xhr) {
        toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra');
      },
      complete: function () {
        $btn.prop('disabled', false);
      }
    })
  }

  // UPDATE EVENT HANDLER
  function handlerUpdateEvent () {
    const row = $(this).closest('tr');
    const id = row.data('id');
    const field = $(this).data('field');
    const value  = field === 'category' ? $(this).val() : $(this).val();

    if (!field || id === null) return;

    $.ajax({
      url: `/api/inventory/ingredient/update/${id}`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ [field] : value }),
      success: function (res) {
        if (res.success) {
          toastr.success(res.message);
        } else {
          toastr.error(res.message)
        }
      },
      error: function (xhr) {
        toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra');
      }
    })
  }

let cropper;
let currentImgCell;

// Khi click vào ảnh trong table
$('#ingredientTable').on('click', '.ingredient-image', function () {
  currentImgCell = $(this).closest('td');

  // Tạo input file ẩn và trigger chọn file
  $('<input type="file" accept="image/*">')
    .on('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (event) {
        // Đổ ảnh vào img#imagePreview
        $('#imagePreview').attr('src', event.target.result);

        // Show modal
        const modalEl = document.getElementById('imageCropModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Khi modal đã hiển thị hết animation, khởi tạo Cropper
        modalEl.addEventListener('shown.bs.modal', () => {
          if (cropper) {
            cropper.destroy();
          }
          cropper = new Cropper(
            document.getElementById('imagePreview'),
            {
              aspectRatio: 1,
              viewMode: 1,
              autoCropArea: 1,
            }
          );
        }, { once: true });
      };
      reader.readAsDataURL(file);
    })
    .trigger('click');
});

// Khi nhấn nút Crop & Save
$('#cropBtn').on('click', function () {
  if (!cropper) return;

  cropper.getCroppedCanvas().toBlob(blob => {
    const formData = new FormData();
    formData.append('file', blob, 'cropped.jpg');

    // Upload file đã crop lên server
    $.ajax({
      url: '/api/upload',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: res => {
        const imgUrl = '/' + res.file.path.replace(/\\/g, '/');
        const timestamp = new Date().getTime();
        // Update src ảnh trong table, thêm timestamp để bust cache
        currentImgCell.find('img').attr('src', `${imgUrl}?t=${timestamp}`);

        // Cập nhật trường image của bản ghi
        const row = currentImgCell.closest('tr');
        const id = row.data('id');
        if (id) {
          $.ajax({
            url: `/api/inventory/ingredient/update/${id}`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ image: imgUrl }),
            success: () => toastr.success('Cập nhật ảnh thành công'),
            error: () => toastr.error('Lỗi khi cập nhật ảnh'),
          });
        }

        // Đóng modal và destroy cropper
        bootstrap.Modal.getInstance(
          document.getElementById('imageCropModal')
        ).hide();
        cropper.destroy();
        cropper = null;
      },
      error: () => toastr.error('Lỗi upload ảnh'),
    });
  }, 'image/jpeg');
});

})