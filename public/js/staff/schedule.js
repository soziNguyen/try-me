$(function () {
  let table
  let users = []
  let shifts = []
  let schedules = []
  let currentDate = new Date()
  let currentView = 'table'
  const csrfToken = $('#_csrf').val()

  Promise.all([fetchData('users'), fetchData('shifts/get')])
    .then(([user, shift]) => {
      users = user.data
      shifts = shift
      loadUserOptions()
      loadShiftOptions()
      initDataTable()
      attachEventHandlers()
    })
    .catch((err) => {
      toastr.error('Không load đủ dữ liệu trước khi khởi tạo DataTable', err)
    })
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(($(window).height() - $('#scheduleTableBody').offset().top - 100) / 45)
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  function loadUserOptions() {
    const select = $('#userId')
    select.html('<option value="">— Chọn nhân viên —</option>')
    users.forEach((user) => {
      select.append(`<option value="${user._id}">${user.username}</option>`)
    })
  }

  function loadShiftOptions() {
    const select = $('#shiftId')
    select.html('<option value="">— Chọn ca làm —</option>')
    shifts.forEach((shift) => {
      const time = shift.startTime && shift.endTime ? `(${shift.startTime} - ${shift.endTime})` : ''
      select.append(`<option value="${shift._id}">${shift.name} ${time}</option>`)
    })
  }

  function initDataTable() {
    table = $('#scheduleTable').DataTable({
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
      order: [],
      ajax: {
        url: '/api/schedules',
        method: 'GET'
      },
      lengthMenu: [showList, showList],
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
      pageLength: numRows,
      columns: [
        {
          data: null,
          orderable: false,
          title: '<input type="checkbox" id="selectAll">',
          className: 'text-center',
          render: (data, type, row) =>
            `<input type="checkbox" class="scheduleCheckbox" data-id="${row._id}">`
        },
        {
          data: 'user',
          title: 'Nhân viên',
          render: (data, type, row) => {
            if (type === 'display') {
              const selectedUserId = row.user?._id || null
              const options = users
                .map(
                  (user) => `
                      <option value="${user._id}" ${user._id === selectedUserId ? 'selected' : ''}>${user.username}</option>
                    `
                )
                .join('')

              const emptyOption = selectedUserId
                ? ''
                : '<option value="" selected>— Chọn nhân viên —</option>'

              return `
                <select class="dataInput form-select border-0" data-field="user" data-schedule-id="${row._id}">
                    ${emptyOption}
                    ${options}
                </select>
              `
            }
            return row.user?.username || ''
          }
        },
        {
          data: 'shift',
          title: 'Ca làm',
          render: (data, type, row) => {
            if (type === 'display') {
              const selectedShiftId = row.shift?._id || null
              const options = shifts
                .map(
                  (shift) => `
                    <option value="${shift._id}" ${shift._id === selectedShiftId ? 'selected' : ''}>${shift.name}</option>
                  `
                )
                .join('')

              const emptyOption = selectedShiftId
                ? ''
                : '<option value="" selected>— Chọn ca làm —</option>'

              return `
                <select class="dataInput form-select border-0" data-field="shift" data-schedule-id="${row._id}">
                    ${emptyOption}
                    ${options}
                </select>
              `
            }
            return row.shift?.name || ''
          }
        },
        {
          data: 'date',
          title: 'Ngày',
          className: 'text-center',
          render: (data, type, row) => {
            if (type === 'display') {
              const dateValue = data ? new Date(data).toISOString().slice(0, 10) : ''
              return `
                <input type="date" class="dataInput border-0 form-control text-center" 
                  data-field="date" 
                  value="${dateValue}">
              `
            }
            return data
          }
        },
        {
          data: 'status',
          title: 'Trạng thái',
          render: (data, type, row) => {
            if (type === 'display') {
              const statuses = ['scheduled', 'confirmed', 'cancelled']
              const opts = statuses.map(
                (s) => `<option value="${s}" ${data === s ? 'selected' : ''}>
                  ${
                    s === 'confirmed'
                      ? 'Đã xác nhận'
                      : s === 'scheduled'
                        ? 'Chờ xác nhận'
                        : 'Đã hủy'
                  }
                  </option>
                `
              )
              return `
                <select class="form-select border-0 dataInput" data-field="status">
                  ${opts}
                </select>`
            }
            return data
          }
        },
        {
          data: 'note',
          title: 'Ghi chú',
          render: (data, type, row) => {
            if (type === 'display') {
              return `
                <input type="text" class="dataInput border-0 w-100 form-control" 
                  data-field="note" 
                  value="${data || ''}" 
                  placeholder="Nhập ghi chú">
              `
            }
            return data
          }
        }
      ],
      rowCallback: function (row, data) {
        $(row).attr('data-id', data._id)
      },
      initComplete: function () {
        $('.right-group').html(`
          <div class="btn-group flex-wrap mb-2">
            <button class="btn btn-outline-danger me-2" id="deleteScheduleBtn">
              <i class="bi bi-trash"></i> Xóa
            </button>
          </div>
        `)
      }
    })

    // handlerAddEvent('#scheduleTable', '#addScheduleBtn', 'schedule')

    handlerDeleteEvent('#scheduleTable', '#deleteScheduleBtn', 'scheduleCheckbox', 'schedule')
    initTableCheckboxEvents('#scheduleTable', 'scheduleCheckbox')
    handlerUpdateEvent('#scheduleTable', 'schedule')
  }

  function attachEventHandlers() {
    // View toggle
    $('#tableViewBtn').on('click', function () {
      currentView = 'table'
      $(this).addClass('active')
      $('#calendarViewBtn').removeClass('active')
      $('#tableView').removeClass('d-none')
      $('#calendarView').addClass('d-none')
    })

    $('#calendarViewBtn').on('click', function () {
      currentView = 'calendar'
      $(this).addClass('active')
      $('#tableViewBtn').removeClass('active')
      $('#tableView').addClass('d-none')
      $('#calendarView').removeClass('d-none')
      loadSchedulesForCalendar()
    })

    // Calendar navigation
    $('.btn-last-month').on('click', function () {
      currentDate.setMonth(currentDate.getMonth() - 1)
      loadSchedulesForCalendar()
    })

    $('.btn-next-month').on('click', function () {
      currentDate.setMonth(currentDate.getMonth() + 1)
      loadSchedulesForCalendar()
    })

    $('.btn-today').on('click', function () {
      currentDate = new Date()
      loadSchedulesForCalendar()
    })

    // Add schedule button
    $('#addScheduleBtn').on('click', function () {
      openScheduleModal()
    })

    // Modal events
    $('#isRecurring').on('change', function () {
      if (this.checked) {
        $('#recurringOptions').removeClass('d-none')
      } else {
        $('#recurringOptions').addClass('d-none')
      }
    })

    // Save schedule
    $('#scheduleModal .btn-primary').on('click', function () {
      saveSchedule()
    })

    // Set min date
    const today = moment().format('YYYY-MM-DD')
    $('#scheduleDate, #recurringEndDate').attr('min', today)
  }

  function loadSchedulesForCalendar() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const startDate = moment([year, month, 1]).format('YYYY-MM-DD')
    const endDate = moment([year, month]).endOf('month').format('YYYY-MM-DD')

    $.ajax({
      url: `/api/schedules/range?startDate=${startDate}&endDate=${endDate}`,
      method: 'GET',
      success: function (res) {
        if (res.data) {
          schedules = res.data || []
          renderCalendarView()
        } else {
          toastr.error(res.message || 'Lỗi tải lịch')
        }
      },
      error: function (xhr) {
        toastr.error(xhr.responseJSON?.message || 'Lỗi tải lịch')
      }
    })
  }

  function renderCalendarView() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    $('#currentMonth').text(`Tháng ${month + 1}, ${year}`)

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    let html = ''
    let dayCounter = 1

    const totalCells = startingDayOfWeek + daysInMonth
    const rows = Math.ceil(totalCells / 7)

    for (let row = 0; row < rows; row++) {
      html += '<div class="row g-2 mb-2">'

      for (let col = 0; col < 7; col++) {
        const cellIndex = row * 7 + col

        if (cellIndex < startingDayOfWeek || dayCounter > daysInMonth) {
          html += '<div class="col"><div class="border rounded p-2 bg-light mh-120"></div></div>'
        } else {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`
          const todayStr = moment().format('YYYY-MM-DD')
          const isToday = dateStr === todayStr
          const isPast = moment(dateStr).isBefore(todayStr)
          const daySchedules = schedules.filter((s) => {
            const scheduleDate = moment(s.date).utc().format('YYYY-MM-DD')
            return scheduleDate === dateStr
          })

          html += `
            <div class="col">
              <div class="border rounded p-2 ${isToday ? 'border-primary border-2' : ''} calendar-day mh-120" 
                   data-date="${dateStr}">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <span class="fw-bold ${isToday ? 'text-primary' : isPast ? 'text-muted' : ''}">${dayCounter}</span>
                  <button class="btn btn-sm btn-link p-0 text-success add-schedule-day-btn" 
                          data-date="${dateStr}" 
                          title="Thêm lịch">
                    <i class="bi bi-plus-circle"></i>
                  </button>
                </div>
                ${renderDaySchedules(daySchedules)}
              </div>
            </div>
          `
          dayCounter++
        }
      }

      html += '</div>'
    }

    $('#calendarGrid').html(html)

    // Attach click handlers
    $('.add-schedule-day-btn').on('click', function (e) {
      e.stopPropagation()
      const date = $(this).data('date')
      openScheduleModal(null, date)
    })

    $('.schedule-item').on('click', function () {
      const scheduleId = $(this).data('schedule-id')
      const schedule = schedules.find((s) => s._id === scheduleId)
      if (schedule) {
        openScheduleModal(schedule)
      }
    })
  }

  function renderDaySchedules(daySchedules) {
    if (daySchedules.length === 0) return '<small class="text-muted">Chưa có lịch</small>'

    let html = ''
    daySchedules.slice(0, 4).forEach((schedule) => {
      const user = users.find((u) => u._id === schedule.user?._id)
      const shift = shifts.find((s) => s._id === schedule.shift?._id)
      const color = getShiftColor(shift?.name)
      const statusIcon =
        schedule.status === 'confirmed' ? '✓' : schedule.status === 'cancelled' ? '✗' : '○'

      html += `
        <div class="badge bg-${color} w-100 text-start mb-1 schedule-item small cursor-pointer font-small" 
             data-schedule-id="${schedule._id}">
          ${statusIcon} ${user?.username || 'N/A'} - ${shift?.name || 'N/A'}
        </div>
      `
    })

    if (daySchedules.length > 4) {
      html += `<small class="text-muted">+${daySchedules.length - 4} ca</small>`
    }

    return html
  }

  function openScheduleModal(schedule = null, defaultDate = null) {
    const isEdit = schedule !== null

    $('#modalTitle').text(isEdit ? 'Sửa lịch làm việc' : 'Thêm lịch làm việc')
    $('#scheduleForm')[0].reset()
    $('#scheduleId').val(schedule?._id || '')
    $('#isRecurring').prop('checked', false).prop('disabled', false)
    $('#recurringOptions').addClass('d-none')

    if (isEdit) {
      $('#isRecurring').prop('disabled', true)
    }

    if (schedule) {
      $('#userId').val(schedule.user?._id || '')
      $('#shiftId').val(schedule.shift?._id || '')
      $('#scheduleDate').val(schedule.date ? moment(schedule.date).format('YYYY-MM-DD') : '')
      $('#scheduleStatus').val(schedule.status || 'scheduled')
      $('#scheduleNote').val(schedule.note || '')
    } else if (defaultDate) {
      $('#scheduleDate').val(defaultDate)
    }

    const modal = new bootstrap.Modal($('#scheduleModal'))
    modal.show()
  }

  function saveSchedule() {
    const form = $('#scheduleForm')[0]
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const $saveBtn = $('#scheduleModal .btn-primary')
    if ($saveBtn.prop('disabled')) return
    $saveBtn
      .prop('disabled', true)
      .html('<i class="spinner-border spinner-border-sm me-1"></i> Đang lưu...')

    const scheduleId = $('#scheduleId').val()
    const isEdit = !!scheduleId

    const data = {
      user: $('#userId').val().trim(),
      shift: $('#shiftId').val().trim(),
      date: $('#scheduleDate').val().trim(),
      status: $('#scheduleStatus').val().trim(),
      note: $('#scheduleNote').val().trim()
    }

    if (!isEdit) {
      data.isRecurring = $('#isRecurring').is(':checked')
      if (data.isRecurring) {
        data.recurringPattern = $('#recurringPattern').val().trim()
        data.recurringEndDate = $('#recurringEndDate').val().trim()
      }
    }

    const csrfToken = $('#_csrf').val()
    const url = isEdit ? `/api/schedule/update/${scheduleId}` : '/api/schedule/create'

    $.ajax({
      url: url,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      headers: { 'x-csrf-token': csrfToken },
      success: function (res) {
        if (res.success) {
          toastr.remove()
          toastr.success(res.message)
          bootstrap.Modal.getInstance($('#scheduleModal')).hide()

          if (currentView === 'table' && table) {
            table.ajax.reload(null, false)
          } else {
            loadSchedulesForCalendar()
          }
        } else {
          toastr.error(res.message)
        }
      },
      error: function (xhr) {
        toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra')
      },
      complete: function () {
        $saveBtn.prop('disabled', false).html('<i class="bi bi-save"></i> Lưu')
      }
    })
  }

  function getShiftColor(shiftName) {
    if (!shiftName) return 'secondary'

    const name = shiftName.toLowerCase()
    if (name.includes('sáng')) return 'primary'
    if (name.includes('chiều')) return 'success'
    if (name.includes('tối')) return 'warning'
    return 'info'
  }
})
