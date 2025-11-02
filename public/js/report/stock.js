$(function () {
  const today = new Date().toISOString().slice(0, 10)
  $('#fromDate').val(today)
  $('#toDate').val(today)

  const table = $('#stockReportTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    paging: true,
    searching: false,
    info: true,
    ordering: false,
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ bản ghi mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ bản ghi)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng',
      loadingRecords: 'Đang tải...'
    },
    columns: [
      {
        data: 'ingredient',
        className: 'py-1',
        title: 'Nguyên liệu',
        render: (data, type) => `<span class="text">${data ?? ''}</span>`
      },
      {
        data: 'category',
        className: 'py-1',
        title: 'Nhóm',
        render: (data, type) => `<span class="text">${data ?? ''}</span>`
      },
      {
        data: 'unit',
        className: 'py-1',
        title: 'ĐVT',
        render: (data, type) => `<span class="text">${data ?? ''}</span>`
      },
      {
        data: 'beginningQty',
        className: 'py-1',
        title: 'Tồn đầu kỳ',
        render: (data, type) => `<span class="number">${data ?? ''}</span>`
      },
      {
        data: 'receivedQty',
        className: 'py-1',
        title: 'Nhập',
        className: 'text-end',
        render: (data, type) => `<span class="number">${data ?? ''}</span>`
      },
      {
        data: 'issuedQty',
        className: 'py-1',
        title: 'Xuất',
        className: 'text-end',
        render: (data, type) => `<span class="number">${data ?? ''}</span>`
      },
      {
        data: 'transferredInQty',
        className: 'py-1',
        title: 'Chuyển đến',
        className: 'text-end',
        render: (data, type) => `<span class="number">${data ?? ''}</span>`
      },
      {
        data: 'transferredOutQty',
        className: 'py-1',
        title: 'Chuyển đi',
        className: 'text-end',
        render: (data, type) => `<span class="number">${data ?? ''}</span>`
      },
      {
        data: 'endingQty',
        className: 'py-1',
        title: 'Tồn cuối kỳ',
        className: 'text-end fw-bold',
        render: (data, type) => `<span class="number">${data ?? ''}</span>`
      }
    ],
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-success btn-sm" id="exportExcelBtn">
            <i class="bi bi-file-earmark-excel"></i> Xuất Excel
          </button>
        </div>
      `)
    }
  })

  // === Hàm load dữ liệu từ API ===
  async function loadStockReport() {
    const from = $('#fromDate').val()
    const to = $('#toDate').val()

    $('#btnLoad').prop('disabled', true).text('Đang tải...')

    try {
      const res = await fetch(`/api/reports/stock/ingredients?from=${from}&to=${to}`)
      const data = await res.json()

      if (res.ok) {
        table.clear().rows.add(data.data).draw()
      } else {
        toastr.error(data.message || 'Lỗi tải dữ liệu')
      }
    } catch (err) {
      toastr.error(err)
    } finally {
      $('#btnLoad').prop('disabled', false).text('Xem báo cáo')
    }
  }

  // === Gắn sự kiện nút "Xem báo cáo" ===
  $('#btnLoad').on('click', loadStockReport)

  // === Tự load báo cáo khi vào trang lần đầu ===
  loadStockReport()
})
