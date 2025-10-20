$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#planTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) showList.push(numRows)
  showList.sort((a, b) => a - b)
  const csrfToken = $('#_csrf').val()

  const table = $('#planTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    serverSide: true,
    processing: true,
    autoWidth: false,
    order: [],
    ajax: { url: '/api/admin/plans', method: 'GET' },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ gói mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ gói',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(lọc từ _MAX_ gói)',
      zeroRecords: 'Không tìm thấy kết quả',
      emptyTable: 'Không có dữ liệu'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="planCheckbox" data-id="${row._id}">`
      },
      {
        data: 'name',
        render: (data) => `<span class="text text-uppercase fw-bold">${data}</span>`
      },
      {
        data: 'priceMonth',
        className: 'text-end',
        render: (d) => `<span class="number">${d?.toLocaleString('vi-VN') ?? 0}</span>`
      },
      {
        data: 'priceYear',
        className: 'text-end',
        render: (d) => `<span class="number">${d?.toLocaleString('vi-VN') ?? 0}</span>`
      },
      {
        data: 'originalPrice',
        className: 'text-end',
        render: (d) => `<span class="number">${d?.toLocaleString('vi-VN') ?? 0}</span>`
      },
      {
        data: 'warehouseLimit',
        className: 'text-center',
        render: (d) => (d === null ? '<span class="text-muted">Không giới hạn</span>' : d)
      },
      {
        data: 'staffLimit',
        className: 'text-center',
        render: (d) => (d === null ? '<span class="text-muted">Không giới hạn</span>' : d)
      },
      {
        data: 'isActive',
        className: 'text-center',
        render: (d) =>
          d
            ? `<span class="badge bg-success">Hoạt động</span>`
            : `<span class="badge bg-secondary">Ẩn</span>`
      },
      {
        data: 'createdAt',
        className: 'text-center',
        render: (d) => new Date(d).toLocaleDateString('vi-VN')
      },
      {
        data: null,
        className: 'text-center',
        orderable: false,
        render: (_, __, row) => `
          <button class="btn btn-sm btn-primary me-1 editBtn" data-id="${row._id}">
            <i class="bi bi-pencil-square"></i>
          </button>
          `
      }
    ],
    rowCallback: (row, data) => $(row).attr('data-id', data._id),
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap mb-2">
          <button class="btn btn-outline-danger me-2" id="deletePlansBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addPlanBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)
    }
  })

  // ========= Modal thêm ==========
  $(document).on('click', '#addPlanBtn', () => {
    $('#planForm')[0].reset()
    $('#planId').val('')
    $('#planModalLabel').text('Thêm gói mới')
    $('#planModal').modal('show')
  })

  // ========= Mở modal sửa ==========
  $(document).on('click', '.editBtn', async function () {
    const id = $(this).data('id')
    const res = await fetch(`/api/admin/plan/${id}`)

    const result = await res.json()
    const data = result.data

    $('#planModalLabel').text('Cập nhật gói')
    $('#planId').val(data._id)
    $('#name').val(data.name)
    $('#monthlyPrice').val(data.priceMonth)
    $('#annualPrice').val(data.priceYear)
    $('#originalPrice').val(data.originalPrice)
    $('#warehouseLimit').val(data.warehouseLimit ?? '')
    $('#staffLimit').val(data.staffLimit ?? '')
    $('#description').val(data.description ?? '')
    $('#isActive').prop('checked', data.isActive)
    $('#planModal').modal('show')
  })

  // ========= Lưu gói (thêm/sửa) ==========
  $('#planForm').on('submit', async (e) => {
    e.preventDefault()
    const id = $('#planId').val()
    const payload = {
      name: $('#name').val(),
      priceMonth: +$('#monthlyPrice').val(),
      priceYear: +$('#annualPrice').val(),
      originalPrice: +$('#originalPrice').val(),
      warehouseLimit: $('#warehouseLimit').val() || null,
      staffLimit: $('#staffLimit').val() || null,
      description: $('#description').val(),
      isActive: $('#isActive').is(':checked')
    }

    const method = id ? 'PUT' : 'POST'
    const url = id ? `/api/admin/plan/update/${id}` : '/api/admin/plan/create'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(payload)
    })
    const data = await res.json()

    if (data.success) {
      $('#planModal').modal('hide')
      toastr.success(id ? 'Đã cập nhật gói!' : 'Đã thêm gói mới!')
      table.ajax.reload(null, false)
    } else toastr.error(data.message || 'Đã có lỗi xảy ra, vui lòng thử lại!')
  })

  handlerDeleteEvent('#planTable', '#deletePlansBtn', 'planCheckbox', 'admin/plan')
  initTableCheckboxEvents('#planTable', 'planCheckbox')
})
