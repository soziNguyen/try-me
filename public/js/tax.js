$(function () {
  let table

  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#taxTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  initDataTable()

  function initDataTable() {
    table = $('#taxTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
        'l' +
        'f' +
        '<"right-group d-flex align-items-center btn-group flex-wrap">' +
        '>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      order: [],
      ajax: {
        url: '/api/taxes',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm thuế',
        lengthMenu: `_MENU_ thuế mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ thuế',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ thuế)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      columns: [
        {
          data: null,
          orderable: false,
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="taxCheckbox" data-id="${row._id}">`
        },
        {
          data: 'name',
          render: (data, type, row) => {
            if (type === 'display') {
              const value = data === '__empty__' ? '' : data
              return ` 
                <input type="text" 
                    class="dataInput form-control w-100 border-0" 
                    data-field="name" 
                    value="${value ?? ''}" 
                    placeholder="Loại phiếu"
                >
              `
            }
            return data
          }
        },
        {
          data: 'rate',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <input type="number" 
                    class="dataInput form-control w-100 border-0" 
                    placeholder="0"
                    data-field="rate" 
                    value="${data ?? ''}"
                >
              `
            }
            return data ?? ''
          }
        },
        {
          data: 'description',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <input type="text" 
                    class="dataInput form-control w-100 border-0" 
                    placeholder="Mô tả" 
                    data-field="description"
                    value="${data ?? ''}"
                >
              `
            }
            return data ?? ''
          }
        },
        {
          data: 'isActive',
          className: 'text-center',
          render: (data) => `
            <input type="checkbox" class="dataInput form-check-input" 
              data-field="isActive" ${data ? 'checked' : ''}
            >
          `
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap">
            <button class="btn btn-outline-danger me-2" id="deleteTaxBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
            <button class="btn btn-outline-success" id="addTaxBtn">
              <i class="bi bi-plus-circle"></i> Thêm
            </button>
          </div>
        `)
      }
    })
    handlerAddEvent('#taxTable', '#addTaxBtn', 'tax')
    handlerDeleteEvent('#taxTable', '#deleteTaxBtn', 'taxCheckbox', 'tax')
    initTableCheckboxEvents('#taxTable', 'taxCheckbox')
    handlerUpdateEvent('#taxTable', 'tax')
  }
})
