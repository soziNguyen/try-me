$(function () {
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#planTableBody').offset().top - 100) / 48)
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
        data: 'code',
        render: (data) => `<span class="text text-uppercase">${data || ''}</span>`
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
        render: (d) => (d === null ? '<span class="number">0</span>' : d)
      },
      {
        data: 'staffLimit',
        className: 'text-center',
        render: (d) => (d === null ? '<span class="number">0</span>' : d)
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
      $('#addPlanBtn').on('click', () => {
        createNewRecord('admin/plan', {}, (data) => {
          window.location.href = `/plan/${data._id}?mode=new`
        })
      })
    }
  })

  $('#planTable').on('click', '.editBtn', function () {
    const id = $(this).data('id')
    window.location.href = `/plan/${id}`
  })

  handlerDeleteEvent('#planTable', '#deletePlansBtn', 'planCheckbox', 'admin/plan')
  initTableCheckboxEvents('#planTable', 'planCheckbox')
})
