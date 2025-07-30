$(function () {

  let showList = [10, 25, 50, 100];
  const numRows = Math.floor(($(window).height() - $('#ingredientCateTableBody').offset().top - 250) / 45);
  if (!showList.includes(numRows)) {
    showList.push(numRows);
  }
  showList.sort((a, b) => a - b);
  const table = $('#ingredientCateTable').DataTable({
      dom: '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    //   serverSide: true,
    //   processing: true,
      order: [],
      ajax: {
        url: '/api/inventory/categories',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ danh mục nguyên liệu mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ danh mục nguyên liệu',
        infoFiltered: '(được lọc từ tổng _MAX_ nguyên liệu)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp'
      },
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) => `<input type="checkbox" class="ingredientCateCheckbox" data-id="${row._id}">`
        },
        { data: 'name',
            render: (data, type, row) => {
                if ( type === 'display' ) {
                  return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="name" value="${data}">`
                }
                return data;
              }
          },
        { data: 'description', 
          render: (data, type, row) => {
            if ( type === 'display' ) {
              return `<input type="text" class="dataInput border-0 w-100 form-control" data-field="description" value="${data}">`
            }
            return data;
          }
        },
      ],
      rowCallback: function(row, data) {
        // Tag row with data-id for update
        $(row).attr('data-id', data._id);
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteIngredientCateBtn">
            <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addIngredientCateBtn">
            <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `);
      }
    });

  //====================================================================================  
  // EVENT HANDLER
  const ingredientWrapper = $('#ingredientCateTable_wrapper');
  ingredientWrapper.on('click', '#addIngredientCateBtn', handlerAddEvent);
  ingredientWrapper.on('click', '#deleteIngredientCateBtn', handlerDeleteEvent);
  $('#ingredientCateTable tbody').on('change', '.dataInput', handlerUpdateEvent);

  // =======================================================
  // HANDLER ADD EVENT
  function handlerAddEvent () {
    const $btn = $(this);
    $btn.prop('disabled', true);
    $.ajax({
      url: '/api/inventory/category/create',
      method: 'POST',
      contentType: 'application/json',
      success: function (res) {
        if (res.success) {
          toastr.success(res.message);
          table.ajax.reload(null, true);
        } else {
          toastr.error(res.message);
        }
      },
      error: function (error) {
        toastr.error(error.responseJSON?.message);
      },
      complete: function () {
        $btn.prop('disabled', false);
      }
    })
  }

  // Click 'tr' prop check or uncheck for tr
  $('#ingredientCateTable tbody').on('click', 'tr', function (e) {
    if ($(e.target).is('input[type=checkbox], input[type=text], .dataInput')) return;
    const checkbox = $(this).find('.ingredientCateCheckbox');
    checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');

  })

  // Handle Select All Checkbox
  ingredientWrapper.on('change', '#selectAll', function () {
    $('.ingredientCateCheckbox').prop('checked', this.checked);
  })

  // Sync Select All Checkbox
  $('#ingredientCateTable tbody').on('change', '.ingredientCateCheckbox', function () {
    const all = $('.ingredientCateCheckbox').length;
    const checked = $('.ingredientCateCheckbox:checked').length;
    $('#selectAll').prop('checked', all > 0 && all === checked);
  })

  // DELETE EVENT HANDLER
  function handlerDeleteEvent () {
    const $btn = $(this);
    $btn.prop('disabled', true);
    const selectedIds = $('.ingredientCateCheckbox:checked').map(function () {
      return $(this).data('id');
    }).get(); // .get() => get Array

    if (selectedIds.length === 0) {
      toastr.warning('Không có nguyên liệu nào được chọn để xóa');
      return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} danh mục nguyên liệu không ?`)) return;

    $.ajax({
      url: '/api/inventory/category/deletes',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ ids: selectedIds }),
      success: function (res) {
        if (res.success) {
          toastr.success(res.message);
          table.ajax.reload(null, true);
          $('#selectAll').prop('checked', false);
        } else {
          toastr.error(res.message);
        }
      },
      error: function (error) {
        toastr.error(error.message);
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
    const value = $(this).val();

    if (!field || id === null) return;

    $.ajax({
      url: `/api/inventory/category/update/${id}`,
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
      error: function (error) {
        toastr.error(error.message);
      }
    })
  }
})