$(function () {
  let table
  let warehouses = []

  Promise.all([fetchData('inventory/warehouse/all')])
    .then(() => {
      initDataTable()
    })
    .catch((err) => {
      toastr.error('Không load được danh sách kho', err)
      initDataTable()
    })

  function initDataTable() {
    let showList = [10, 25, 50, 100]
    const numRows = 15 // mặc định

    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#product-dataTable').DataTable({
      dom:
        '<"top-bar d-flex align-items-center justify-content-between flex-wrap"l f>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: true,
      scrollX: true,
      order: [],
      ajax: {
        url: '/api/product/entries?flatten=true',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm sản phẩm...',
        lengthMenu: `_MENU_ sản phẩm mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trên tổng _TOTAL_ sản phẩm',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(lọc từ _MAX_ sản phẩm)',
        zeroRecords: 'Không tìm thấy sản phẩm phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      columns: [
        {
          data: 'product',
          title: 'Tên sản phẩm',
          className: 'text-start fw-bold',
          render: (product) => product?.name || ''
        },
        {
          data: 'beginningQty',
          title: 'Tồn đầu',
          className: 'text-end py-2',
          render: (data) => `<span class="number">${formatNumber(data)}</span>`
        },
        {
          data: 'quantity',
          title: 'Số Lượng Nhập',
          className: 'text-end py-2',
          render: (val) => {
            const formatted = (val || 0).toLocaleString('vi-VN')
            return val > 0
              ? `<span class="number text-success fw-semibold">+${formatted}</span>`
              : `<span class="number">${formatted}</span>`
          }
        },
        {
          data: 'sold',
          title: 'Đã bán',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            return val > 0
              ? `<span class="number text-danger fw-semibold">-${formatted}</span>`
              : `<span class="number">${formatted}</span>`
          }
        },
        {
          data: 'endingQty',
          title: 'Tồn cuối',
          className: 'text-end py-2',
          render: (data) => {
            const val = data || 0
            const formatted = formatNumber(val)
            const colorClass = val > 0 ? 'text-primary' : val < 0 ? 'text-danger' : ''
            return `<span class="number fw-bold ${colorClass}">${formatted}</span>`
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      }
    })
  }
})
