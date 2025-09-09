$(function () {
  let table

  function initDataTable() {
    let showList = [10, 25, 50, 100]
    const numRows = Math.floor(
      ($(window).height() - $('#stockHistoryTableBody').offset().top - 100) / 45
    )
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#stockHistoryTable').DataTable({
      dom:
        '<"top-bar d-flex justify-content-between mb-3"l f>' +
        'rt' +
        '<"bottom-bar d-flex justify-content-between mt-3"ip>',
      serverSide: true,
      processing: true,
      autoWidth: false,
      order: [[0, 'desc']],
      ajax: {
        url: '/api/inventory/stock-histories',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      pageLength: numRows,
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ phiếu mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ phiếu',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(lọc từ _MAX_ phiếu)',
        zeroRecords: 'Không tìm thấy',
        emptyTable: 'Không có dữ liệu'
      },
      columns: [
        {
          title: 'Mã phiếu',
          className: 'text-center',
          data: 'documentCode',
          render: (data) => data ?? ''
        },
        {
          title: 'Loại phiếu',
          className: 'text-center',
          data: 'transactionType',
          render: (data) => {
            const mapType = {
              ENTRY: 'Nhập kho',
              ISSUE: 'Xuất kho',
              TRANSFER: 'Chuyển kho'
            }
            return mapType[data] || data
          }
        },
        {
          title: 'Ngày giao dịch',
          className: 'text-center',
          data: 'transactionDate',
          render: (data) => {
            const d = new Date(data)
            return d.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })
          }
        },
        {
          title: 'Nguyên liệu',
          className: 'text-center',
          data: 'items',
          render: (items) => {
            if (!items || !Array.isArray(items) || items.length === 0) {
              return '-'
            }

            const ingredientNames = items.map((item) => {
              let name = 'N/A'
              if (typeof item.ingredient === 'object' && item.ingredient.name) {
                name = item.ingredient.name
              } else if (typeof item.ingredient === 'string') {
                name = item.ingredient
              }
              return `${name} (${item.quantity || 0})`
            })

            const tooltip = ingredientNames.join('\n')

            if (ingredientNames.length > 2) {
              const first2 = ingredientNames.slice(0, 2).join('<br>')
              const remaining = ingredientNames.length - 2
              const display = `${first2}<br><small class="text-muted">và ${remaining} khác</small>`
              return `<span title="${tooltip}">${display}</span>`
            }

            return `<span title="${tooltip}">${ingredientNames.join('<br>')}</span>`
          }
        },
        {
          title: 'Tổng Số Lượng',
          className: 'text-center',
          data: 'totalQuantity',
          render: (data) => (data || 0).toLocaleString()
        },
        {
          title: 'Người tạo',
          className: 'text-center',
          data: 'createdBy',
          render: (data) => data?.username ?? ''
        },
        {
          data: null,
          orderable: false,
          className: 'text-center',
          width: '100px',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <button class="btn btn-sm btn-outline-primary my-1 detail-btn" 
                        data-id="${row.documentId}"
                        data-type="${row.transactionType}"
                        title="Xem chi tiết">
                  <i class="bi bi-eye"></i> Chi tiết
                </button>`
            }
            return ''
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          const type = $(this).data('type')
          let url = ''

          switch (type) {
            case 'ENTRY':
              url = `/inventory/stock-entry/${id}?from=history`
              break
            case 'ISSUE':
              url = `/inventory/stock-issue/${id}?from=history`
              break
            case 'TRANSFER':
              url = `/inventory/stock-transfer/${id}?from=history`
              break
            default:
              url = `/inventory/stock-entry/${id}?from=history`
          }
          window.location.href = url
        })
      }
    })
  }

  initDataTable()
})
