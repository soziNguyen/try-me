$(function () {
  let table

  // Hàm định dạng tiền tệ
  const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)

  // Hàm set ngày theo loại kỳ và quý
  function setDateInputs(type, quarter) {
    const today = new Date()
    const year = today.getFullYear()
    let startDate, endDate

    if (type === 'month') {
      startDate = new Date(year, today.getMonth(), 1)
      endDate = new Date(year, today.getMonth() + 1, 0)
    } else if (type === 'quarter') {
      const q = quarter || Math.floor(today.getMonth() / 3) + 1
      const startMonth = (q - 1) * 3
      const endMonth = startMonth + 2
      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, endMonth + 1, 0)
    } else if (type === 'custom') {
      return
    }

    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    $('#startDate').val(format(startDate))
    $('#endDate').val(format(endDate))
  }

  // Khởi tạo DataTable
  function initTaxDataTable() {
    const showList = [10, 25, 50, 100]
    const numRows = Math.floor(($(window).height() - $('#tax-data').offset().top - 100) / 45)
    if (!showList.includes(numRows)) showList.push(numRows)
    showList.sort((a, b) => a - b)

    table = $('#tax-dataTable').DataTable({
      serverSide: false,
      processing: true,
      autoWidth: true,
      scrollX: true,
      ordering: true,
      lengthMenu: [showList, showList],
      pageLength: numRows,
      columns: [
        {
          data: 'updatedAt',
          title: 'Thời gian',
          render: (data, type) =>
            type === 'display'
              ? `<span class="text form-control border-0">${new Date(data).toLocaleDateString('vi-VN')}</span>`
              : data
        },
        {
          data: 'warehouse.name',
          title: 'Kho',
          className: 'text-start px-1',
          render: (data, type, row) =>
            type === 'display'
              ? row.warehouse
                ? `${row.warehouse.name} - ${row.warehouse.location}`
                : ''
              : row.warehouse?.name || ''
        },
        {
          data: 'totalPayable',
          title: 'Tổng tiền trước thuế',
          render: (data, type) =>
            type === 'display'
              ? `<span class="number form-control border-0">${formatCurrency(data)}</span>`
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
              ? `<span class="number form-control border-0">${formatCurrency(data)}</span>`
              : data
        }
      ],
      rowCallback: (row, data) => $(row).attr('data-id', data._id),
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm',
        lengthMenu: '_MENU_ bản ghi mỗi trang',
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ bản ghi',
        infoEmpty: 'Không có bản ghi nào',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Chưa có dữ liệu.'
      }
    })
  }

  // Load dữ liệu theo bộ lọc
  function loadTaxData() {
    $.get('/api/orders/get', {
      startDate: $('#startDate').val(),
      endDate: $('#endDate').val(),
      warehouseId: $('#warehouseId').val()
    })
      .done((res) => {
        const data = res.data || []
        if (!table) initTaxDataTable()
        table.clear().rows.add(data).draw()
      })
      .fail((err) => {
        console.error('Lấy dữ liệu thất bại', err)
        table?.clear().draw()
      })
  }

  // Event: thay đổi loại kỳ
  $('#reportType').on('change', function () {
    const type = $(this).val()
    if (type === 'quarter') {
      $('#quarterGroup').show()
      const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1
      $('#quarterSelect').val(currentQuarter)
      setDateInputs('quarter', currentQuarter)
    } else {
      $('#quarterGroup').hide()
      setDateInputs(type)
    }
    if (type !== 'custom') loadTaxData()
  })

  // Event: thay đổi quý
  $('#quarterSelect').on('change', function () {
    setDateInputs('quarter', parseInt($(this).val()))
    loadTaxData()
  })

  // Event: lọc thủ công
  $('#filterDateBtn').on('click', loadTaxData)

  // Khởi chạy lần đầu
  const initialType = $('#reportType').val()
  setDateInputs(initialType)
  initTaxDataTable()
  loadTaxData()
})
