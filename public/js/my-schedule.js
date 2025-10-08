$(function () {
  let table

  initDataTable()

  function initDataTable() {
    table = $('#myScheduleTable').DataTable({
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
      order: [[1, 'asc']], // sắp xếp theo ngày
      ajax: {
        url: '/api/schedules/my',
        method: 'GET'
      },
      language: {
        search: '',
        searchPlaceholder: 'Tìm kiếm lịch làm việc',
        lengthMenu: `_MENU_ lịch làm việc mỗi trang`,
        info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ lịch làm việc',
        infoEmpty: 'Không có bản ghi nào',
        infoFiltered: '(được lọc từ tổng _MAX_ lịch làm việc)',
        zeroRecords: 'Không tìm thấy kết quả phù hợp',
        emptyTable: 'Không có dữ liệu trong bảng'
      },
      columns: [
        {
          data: 'date',
          title: 'Ngày',
          className: 'text-center',
          render: (data) => {
            if (!data) return ''
            const d = new Date(data)
            return d.toLocaleDateString('vi-VN') // dd/mm/yyyy
          }
        },
        {
          data: 'shift',
          title: 'Ca làm',
          render: (data) => {
            if (!data) return ''
            let ca = data.name || ''
            let type = data.type && data.type === 'day' ? ' (Ngày)' : 'Đêm'
            let time =
              data.startTime && data.endTime ? ` - ${data.startTime} ~ ${data.endTime}` : ''
            return ca + type + time
          }
        },
        {
          data: 'status',
          title: 'Trạng thái',
          className: 'text-center',
          render: (data) => {
            const map = {
              scheduled:
                '<span class="bg-info badge text-center d-block mx-auto w-50 p-2">Chờ xác nhận</span>',
              confirmed:
                '<span class="bg-success badge text-center d-block mx-auto w-50 p-2">Đã xác nhận</span>',
              cancelled:
                '<span class="bg-danger badge text-center d-block mx-auto w-50 p-2">Đã hủy</span>'
            }
            return map[data] || ''
          }
        },
        {
          data: 'note',
          title: 'Ghi chú',
          render: (data) => `
            <span class="form-control w-100 border-0">${data || ''}</span>
          `
        }
      ]
    })
  }
})
