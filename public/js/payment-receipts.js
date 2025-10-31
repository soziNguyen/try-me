$(function () {
  let table

  // Tính số dòng hiển thị dựa trên chiều cao cửa sổ
  const showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#receiptTableBody').offset().top - 120) / 45)
  if (!showList.includes(numRows)) showList.push(numRows)
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
        method: 'GET',
        data: function (d) {
          d.startDate = $('#startDate').val()
          d.endDate = $('#endDate').val()
          d.warehouseId = $('#warehouseId').val()
        },
        dataSrc: function (response) {
          const summary = response.summary || {}
          $('#summary-total-orders').text(summary.totalOrders || 0)
          $('#summary-total-amount').text((summary.totalAmount || 0).toLocaleString('vi-VN'))
          return response.data
        }
      },
      lengthMenu: [showList, showList],
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: `_MENU_ chi tiết hóa đơn`,
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
          render: (data, type) => {
            const tableName = data?.name || 'Mang về'
            return type === 'display'
              ? `<span class="number form-control border-0 text-start">${tableName}</span>`
              : (data ?? '')
          }
        },
        {
          data: 'customer',
          title: 'Khách hàng',
          render: (customer, type) => {
            const name = customer?.name?.trim() ? customer.name : 'Khách lẻ'
            return type === 'display'
              ? `<span class="text form-control border-0">${name}</span>`
              : name
          }
        },
        {
          data: 'items',
          title: 'Món ăn',
          render: (data, type) => {
            if (type !== 'display') return data
            if (!data?.length) return `<span class="text form-control border-0">0 món</span>`

            const names = data.map((i) => i.foodName || i.comboName || '').filter((n) => n)
            let displayNames = names.slice(0, 3).join(', ')
            if (names.length > 3) displayNames += ` +${names.length - 3} món`
            return `<span class="text form-control border-0">${displayNames}</span>`
          }
        },
        {
          data: 'totalPayable',
          title: 'Tổng tiền trước thuế',
          render: (data, type) =>
            type === 'display'
              ? `<span class="number form-control border-0">${Number(data || 0).toLocaleString('vi-VN')}</span>`
              : data
        },
        {
          data: 'vatRate',
          title: 'VAT',
          render: (data, type) =>
            type === 'display'
              ? `<span class="text form-control border-0 text-end">${data ?? 0} %</span>`
              : (data ?? 0)
        },
        {
          data: 'total',
          title: 'Tổng tiền',
          render: (data, type) =>
            type === 'display'
              ? `<span class="number form-control border-0">${Number(data || 0).toLocaleString('vi-VN')}</span>`
              : data
        },
        {
          data: 'updatedAt',
          title: 'Thời gian',
          render: (data, type) => {
            if (type !== 'display') return data
            const dt = new Date(data)
            return `<span class="text form-control border-0">${dt.toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}</span>`
          }
        }
      ],
      rowCallback: (row, data) => $(row).attr('data-id', data._id)
    })
  }

  // Filter & reload table
  $('#filterDateBtn').on('click', function () {
    table.ajax.reload()
    $('#toggleFilterBtn').dropdown('hide')

    const start = $('#startDate').val()
    const end = $('#endDate').val()
    if (start && end) {
      $('#toggleFilterBtn').html(`<i class="bi bi-calendar3 me-2"></i> ${start} → ${end}`)
    } else {
      $('#toggleFilterBtn').html(`<i class="bi bi-calendar3 me-2"></i> Chọn ngày lọc`)
    }
  })

  // Print table data
  $('#printBtn').on('click', function () {
    const summary = {
      totalOrders: $('#summary-total-orders').text(),
      totalAmount: $('#summary-total-amount').text()
    }
    const tableData = table.rows({ search: 'applied' }).data().toArray()

    localStorage.setItem(
      'printData',
      JSON.stringify({
        summary,
        tableData,
        startDate: $('#startDate').val(),
        endDate: $('#endDate').val()
      })
    )

    window.open('/payment-receipts-print', '_blank')
  })
})
