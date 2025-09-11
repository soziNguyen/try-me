$(function () {
  let table
  let fullData = []
  const csrfToken = $('#_csrf').val()

  loadOrganizations($('#organizations'))
  $.getJSON('data/full_address.json', (res) => {
    if (res.error == 0 && res.data) {
      fullData = res.data
    }
  })

  const dataFields = ['username', 'email', 'role']
  let showList = [10, 25, 50, 100]
  const numRows = Math.floor(
    ($(window).height() - $('#userTableBody').offset().top - 100) / 45
  )
  if (!showList.includes(numRows)) {
    showList.push(numRows)
  }
  showList.sort((a, b) => a - b)

  table = $('#userTable').DataTable({
    dom:
      '<"top-bar d-flex align-items-center justify-content-between flex-wrap mb-3"' +
      'l' +
      'f' +
      '<"right-group d-flex align-items-center btn-group flex-wrap">' +
      '>' +
      'rt' +
      '<"bottom-bar d-flex justify-content-between mt-3"ip>',
    serverSide: true,
    processing: true,
    autoWidth: false,
    // scrollX: true,
    order: [],
    ajax: {
      url: '/api/admin/users',
      method: 'GET'
    },
    lengthMenu: [showList, showList],
    language: {
      search: '',
      searchPlaceholder: 'Tìm kiếm',
      lengthMenu: `_MENU_ người dùng mỗi trang`,
      info: 'Hiển thị _START_ đến _END_ trong tổng _TOTAL_ người dùng',
      infoEmpty: 'Không có bản ghi nào',
      infoFiltered: '(được lọc từ tổng _MAX_ người dùng)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Không có dữ liệu trong bảng'
    },
    pageLength: numRows,
    columns: [
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) =>
          `<input type="checkbox" class="userCheckbox" data-id="${row._id}">`
      },
      ...dataFields.map((field) => {
        return {
          data: field,
          render: (data, type, row) => {
            if (type === 'display') {
              return data ? data : ''
            }
            return data
          }
        }
      }),
      {
        data: 'organization',
        className: 'text-start px-1',
        render: function (data, type, row) {
          if (type === 'display') {
            if (!data) return ''
            const provinceObj = fullData.find((p) => p.id === data.province)
            const provinceName = provinceObj ? provinceObj.name : ''
            return `${data.name}${provinceName ? ' - ' + provinceName : ''}`
          }
          return data._id || null
        }
      },
      {
        data: 'createdAt',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return new Date(data).toLocaleDateString('vi-VN')
        }
      },
      {
        data: 'updatedAt',
        render: (data, type, row) => {
          if (type === 'display') {
            return data ? data : ''
          }
          return new Date(data).toLocaleDateString('vi-VN')
        }
      },
      {
        data: null,
        orderable: false,
        className: 'text-center',
        render: (data, type, row) => {
          return `<button title="Cập nhật" class="btn btn-outline-primary updateUserBtn" data-id="${row._id}"><i class="bi bi-pencil-square"></i></button>`
        }
      }
    ],
    rowCallback: function (row, data) {
      // Tag row with data-id for update
      $(row).attr('data-id', data._id)
    },
    initComplete: function () {
      $('.right-group').html(`
        <div class="btn-group flex-wrap">
          <button class="btn btn-outline-danger me-2" id="deleteUserBtn">
          <i class="bi bi-trash"></i> Xóa
          </button>
          <button class="btn btn-outline-success" id="addUserBtn">
          <i class="bi bi-plus-circle"></i> Thêm
          </button>
        </div>
      `)

      // Show modal for adding new user
      $('#userTable_wrapper').on('click', '#addUserBtn', function () {
        $('#newUserModal').modal('show')
      })

      // Handle submit for new user form
      $('#newUserForm').on('submit', function (e) {
        e.preventDefault()
        const data = {
          username: $('#username').val().trim(),
          email: $('#email').val().trim(),
          organization: $('#organizations').val(),
          password: $('#password').val().trim(),
          confirmPassword: $('#confirm-password').val().trim()
        }

        $.ajax({
          url: '/api/admin/create',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(data),
          headers: { 'x-csrf-token': csrfToken },
          success: function (res) {
            if (res.success) {
              toastr.remove()
              $('#newUserModal').modal('hide')
              toastr.success(res.message || 'Tạo người dùng thành công')
              clearForm('new')
              table.ajax.reload()
            } else {
              toastr.error(res.message || 'Đã có lỗi xảy ra')
            }
          },
          error: function (xhr) {
            toastr.remove()
            toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra')
          }
        })
      })

      // Handle delete user
      handlerDeleteEvent(
        '#userTable',
        '#deleteUserBtn',
        'userCheckbox',
        'admin'
      )

      // Handle update user
      $('#userTable_wrapper').on('click', '.updateUserBtn', function () {
        const userId = $(this).data('id')
        const roles = ['Admin', 'Org', 'Member']
        const $roleSelected = $('#new-role')
        $roleSelected.empty().append(
          roles
            .map((role) => {
              return `<option value=${role}>${role}</option>`
            })
            .join('')
        )
        $.getJSON(`/api/admin/users/${userId}`, function (res) {
          if (res.success) {
            const user = res.data
            $('#new-username').val(user.username || '')
            $('#new-email').val(user.email || '')
            $roleSelected.val(user.role || 'Member')
            loadOrganizations($('#new-organizations'), user.organization?._id)
              .then(() => {
                $('#updateUserForm').data({
                  'user-id': userId,
                  'original-role': user.role || 'Member'
                })
                $('#updateUserModal').modal('show')
              })
              .catch((error) => {
                // console.error('Error loading organizations:', error)
              })
          } else {
            toastr.error('Không thể tải thông tin người dùng')
          }
        }).fail(function (xhr) {
          toastr.error(xhr.responseJSON?.message || 'Đã có lỗi xảy ra')
        })
      })
      $('#updateUserForm').on('submit', function (e) {
        e.preventDefault()
        const id = $(this).data('user-id')
        const originRole = $(this).data('original-role')
        const currentUserId = $('#currentUserId').val()
        const isUpdatingSelf = id === currentUserId

        const formData = {
          username: $('#new-username').val().trim(),
          email: $('#new-email').val().trim(),
          organization: $('#new-organizations').val(),
          role: $('#new-role').val(),
          password: $('#new-password').val().trim(),
          confirmPassword: $('#new-confirm-password').val().trim()
        }

        if (formData.role !== originRole && isUpdatingSelf) {
          toastr.warning('Bạn không thể thay đổi vai trò của chính mình')
          return
        }

        $.ajax({
          url: `/api/admin/update/${id}`,
          method: 'PUT',
          contentType: 'application/json',
          data: JSON.stringify(formData),
          headers: { 'x-csrf-token': csrfToken },
          success: function (res) {
            if (res.success) {
              toastr.success(res.message)
              $('#updateUserModal').modal('hide')
              clearForm('update')
              table.ajax.reload()
            } else {
              toastr.error(res.message)
            }
          },
          error: function (xhr) {
            toastr.error(xhr.responseJSON?.message)
          }
        })
      })
    }
  })
  initTableCheckboxEvents('#userTable', 'userCheckbox')
})
