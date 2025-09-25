$(function () {
  let table

  // Render dataTable
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#receiptTableBody').offset().top - 120) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)
  initDataTable()

  function initDataTable() {
    table = $('#receiptTable').DataTable({
      serverSide: true,
      processing: true,
      autoWidth: false,
      order: [],
      ajax: {
        url: '/api/orders/get',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ hóa đơn mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ hóa đơn',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ hóa đơn)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      pageLength: numRows,
      columns: [
        {
          data: 'table',
          title: 'Bàn',
          render: (data, type, row) => {
            const tableName = data ? data.name || '' : 'Mang về'
            if (type === 'display') {
              return `<span class="number form-control border-0">${tableName}</span>`
            }
            return data ?? ''
          }
        },
        {
          data: 'customer.name',
          title: 'Khách hàng',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="text form-control border-0">${data ?? ''}</span>`
            }
            return data ?? ''
          }
        },
        {
          data: 'items',
          title: 'Món ăn',
          render: (data, type, row) => {
            if (type === 'display') {
              if (!data || data.length === 0)
                return `<span class="text form-control border-0">0 món</span>`
              const names = data.map((i) => i.foodName || i.comboName || '').filter((n) => n)
              let displayNames = names.slice(0, 3).join(', ')
              if (names.length > 3) displayNames += ` +${names.length - 3} món`
              return `<span class="text form-control border-0">${displayNames}</span>`
            }
            return data
          }
        },
        {
          data: 'total',
          title: 'Tổng tiền',
          render: (data, type, row) => {
            if (type === 'display') {
              return `<span class="number form-control border-0">${data ?? ''}</span>`
            }
            return data
          }
        },
        {
          data: 'updatedAt',
          title: 'Thời gian',
          render: (data, type, row) => {
            if (type === 'display') {
              const dt = new Date(data)
              return `<span class="text form-control border-0">${dt.toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}</span>`
            }
            return data
          }
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
                        data-id="${row._id}" 
                        title="Xem chi tiết">
                  <i class="bi bi-eye"></i> Chi tiết
                </button>`
            }
            return ''
          }
        }
      ],
      rowCallback: function (row, data) {
        // Tag row with data-id for update
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $(document).on('click', '.detail-btn', function () {
          const id = $(this).data('id')
          window.location.href = `/receipt/${id}`
        })
      }
    })
  }
})
