function handlerAddEvent(tableSelector, btnSelector, api) {
    const $wrapper = $(`${tableSelector}_wrapper`);
    const table = $(tableSelector).DataTable();
  
    $wrapper.on('click', btnSelector, function () {
      const $btn = $(this).prop('disabled', true);
      
      $.ajax({
        url: api,
        method: 'POST',
        success(res) {
          if (res.success) {
            toastr.success(res.message);
            table.ajax.reload(null, false);
          } else {
            toastr.error(res.message);
          }
        },
        error(xhr) {
          toastr.error(xhr.responseJSON?.message || 'Lỗi');
        },
        complete() {
          $btn.prop('disabled', false);
        }
      });
    });
  }

function handlerDeleteEvent (tableSelector, btnSelector, checkboxClass, api) {
    const $wrapper = $(`${tableSelector}_wrapper`);
    const table = $(tableSelector).DataTable();
  
    $wrapper.on('click', btnSelector, function () {
      const $btn = $(this).prop('disabled', true);
      const selected = $wrapper.find(`.${checkboxClass}:checked`).map((_, el) => $(el).data('id')).get();
  
      if (!selected.length) {
        toastr.warning('Không có bản ghi nào được chọn để xóa');
        return $btn.prop('disabled', false);
      }
  
      if (!confirm(`Bạn có chắc chắn muốn xóa ${selected.length} bản ghi không ?`)) {
        return $btn.prop('disabled', false);
      }
  
      $.ajax({
        url: api,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: selected }),
        success(res) {
          toastr.success(res.message);
          table.ajax.reload(null, false);
        },
        error(xhr) {
          toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra');
        },
        complete() {
          $btn.prop('disabled', false);
        }
      });
    });
}
  

function handlerUpdateEvent(tableSelector) {
    const $table = $(tableSelector);
    $table.on('change', '.dataInput', function () {
      const id = $(this).closest('tr').data('id');
      const field = $(this).data('field');
      const value = $(this).val();
  
      if (!field || id === null) return;
  
      $.ajax({
        url: `/api/inventory/category/update/${id}`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ id, [field]: value }),
        success: function (res) {
          if (res.success) {
            toastr.success(res.message);
          } else {
            toastr.error(res.message);
          }
        },
        error: function (xhr) {
          toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra');
        }
      });
    });
}
  

function initTableCheckboxEvents(tableSelector, checkboxClass) {
  const $table = $(tableSelector);
  const $wrapper = $(`${tableSelector}_wrapper`);
  const selectAllSelector = '#selectAll';

  // Click 'tr' event
  $table.on('click', 'tbody tr', function (e) {
    if ($(e.target).is(`input[type=checkbox], input[type=text], .dataInput`)) return;
    const checkbox = $(this).find(`.${checkboxClass}`);
    checkbox.prop('checked', !checkbox.prop('checked')).trigger('change');
  });

  // Select All checkbox
  $wrapper.on('change', selectAllSelector, function () {
    $table.find(`.${checkboxClass}`).prop('checked', this.checked);
  });

  // Sync Select All
  $table.on('change', `.${checkboxClass}`, function () {
    const all = $table.find(`.${checkboxClass}`).length;
    const checked = $table.find(`.${checkboxClass}:checked`).length;
    $wrapper.find(selectAllSelector).prop('checked', all > 0 && all === checked);
  });
}
  