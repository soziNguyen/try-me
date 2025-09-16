const logInForm = document.getElementById('login-form')
const signUpForm = document.getElementById('signup-form')
const forgotForm = document.getElementById('forgot-password')
const resetForm = document.getElementById('reset-form')

if (logInForm) {
  // Điền sẵn giá trị từ localStorage khi trang login load
  window.addEventListener('DOMContentLoaded', () => {
    const loginField = document.getElementById('login')
    const passwordField = document.getElementById('password')
    const rememberCheckbox = document.getElementById('remember')

    const savedLogin = localStorage.getItem('savedLogin') || ''
    const savedRemember = localStorage.getItem('savedRemember') === 'true'
    const savedPassword = savedRemember
      ? localStorage.getItem('savedPassword') || ''
      : ''

    loginField.value = savedLogin
    rememberCheckbox.checked = savedRemember
    if (savedRemember) {
      passwordField.value = savedPassword
    }
  })

  logInForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const loginField = document.getElementById('login')
    const passwordField = document.getElementById('password')
    const rememberCheckbox = document.getElementById('remember')

    if (!loginField || !passwordField) {
      toastr.warning('Username or Password fields are missing.')
      return
    }

    const login = loginField.value.trim()
    const password = passwordField.value
    const remember = rememberCheckbox.checked

    if (!login || !password) {
      toastr.warning('Please enter both username and password.')
      return
    }

    // Lưu vào localStorage
    localStorage.setItem('savedLogin', login)
    if (remember) {
      localStorage.setItem('savedPassword', password)
      localStorage.setItem('savedRemember', 'true')
    } else {
      localStorage.removeItem('savedPassword')
      localStorage.setItem('savedRemember', 'false')
    }

    try {
      const result = await ajax('/api/users/login', {
        login,
        password,
        remember: remember ? 1 : 0
      })
      if (result) {
        toastr.success('Đăng nhập thành công. Đang chuyển hướng...')
        setTimeout(() => {
          window.location.href = '/'
        }, 500)
      }
    } catch (error) {
      toastr.error(error.message)
    }
  })
} else if (signUpForm) {
  signUpForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    // Lấy data từ form organization + admin
    const formData = new FormData(signUpForm)
    const data = {
      orgName: formData.get('orgName'),
      orgEmail: formData.get('orgEmail'),
      orgPhone: formData.get('orgPhone'),
      orgProvince: formData.get('orgProvince'),
      orgCommune: formData.get('orgCommune'),
      orgStreet: formData.get('orgStreet'),
      adminUsername: formData.get('adminUsername'),
      adminEmail: formData.get('adminEmail'),
      adminPassword: formData.get('adminPassword')
    }

    const confirmPassword = formData.get('confirmPassword')

    // Validate
    if (data.adminPassword !== confirmPassword) {
      toastr.warning('Mật khẩu không khớp')
      return
    }

    if (!data || Object.values(data).some((value) => !value)) {
      toastr.warning('Vui lòng điền đầy đủ thông tin.')
      return
    }

    try {
      const result = await ajax('/api/organization/create', data)
      if (result) {
        toastr.success(
          'Tổ chức và quản trị viên đã được tạo thành công. Đang chuyển hướng đến trang đăng nhập...'
        )
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
      }
    } catch (error) {
      toastr.error(error.message)
    }
  })
} else if (forgotForm) {
  forgotForm.addEventListener('submit', async function (event) {
    event.preventDefault()

    const emailElement = document.getElementById('email')
    const email = emailElement.value.trim()

    if (!email) {
      toastr.warning('Vui lòng nhập email của bạn.')
      emailElement.focus()
      return
    }

    try {
      const result = await ajax('/api/users/forgot', { email })
      if (result) {
        toastr.info(
          'Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến của bạn.'
        )
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
      }
    } catch (error) {
      toastr.error(error.message)
    }
  })
} else if (resetForm) {
  document.addEventListener('DOMContentLoaded', () => {
    // Lấy token từ URL (http://localhost:3003/reset-password/:token)
    const token = window.location.pathname.split('/').pop()

    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault()

      const newPasswordElement = document.getElementById('newPassword')
      const confirmPasswordElement = document.getElementById('confirmPassword')

      const newPassword = newPasswordElement.value.trim()
      const confirmPassword = confirmPasswordElement.value.trim()

      if (newPassword.length === 0) {
        toastr.warning('Trường này là bắt buộc.')
        newPasswordElement.focus()
        return
      }
      if (confirmPassword.length === 0) {
        toastr.warning('Trường này là bắt buộc.')
        confirmPasswordElement.focus()
        return
      }
      if (!isValidPassword(newPassword)) {
        toastr.warning(
          'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm ký tự hoa, thường, số và ký tự đặc biệt.'
        )
        return
      }
      if (!isValidPassword(newPassword, confirmPassword)) {
        toastr.warning('Mật khẩu không khớp.')
        return
      }
      try {
        const result = await ajax(`/api/users/reset-password/${token}`, {
          newPassword,
          confirmPassword
        })
        if (result) {
          toastr.success('Thay đổi mật khẩu thành công.')
          setTimeout(() => {
            const confirmChange = confirm('Bạn có muốn đăng nhập?')
            if (!confirmChange) return
            window.location.href = '/login'
          }, 400)
        }
      } catch (error) {
        toastr.error(error.message)
      }
    })
  })
} else {
  document.addEventListener('DOMContentLoaded', async () => {
    await getUsers()
    await addUser()
  })

  document
    .getElementById('userTableBody')
    .addEventListener('click', async (event) => {
      const btn = event.target.closest('.updateUserBtn')
      if (btn) {
        const userId = btn.getAttribute('data-id')
        if (userId) {
          await updateUser(userId)
        }
      }
    })

  async function addUser() {
    const newUserModalElement = document.getElementById('newUserModal')
    const newUserModal = newUserModalElement
      ? new bootstrap.Modal(newUserModalElement)
      : null
    const newUser = document.querySelector('#newUser')
    const form = document.getElementById('newUserForm')

    if (newUser && newUserModal) {
      newUser.addEventListener('click', function () {
        newUserModal.show()
      })
    }

    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault()

        const { username, email, password, confirmPassword } = getFormData()
        const checkInPut = validateUserInput(
          username,
          email,
          password,
          confirmPassword
        )

        if (checkInPut) {
          toastr.warning(checkInPut)
          return
        }

        try {
          const result = await ajax('/api/users/create', {
            username,
            email,
            password
          })
          if (result) {
            toastr.success('Thêm thành công')
            if (newUserModal) newUserModal.hide()
            clearForm('new')
            await getUsers()
          }
        } catch (error) {
          toastr.error(error.message)
        }
      })
    }
  }

  let userData = []
  async function getUsers() {
    try {
      const users = await ajax('/api/users', {}, 'GET')
      if (users) {
        userData = users
        renderTable(users)
        document.getElementById('selectAll').checked = false
      }
    } catch (error) {
      toastr.error(error.message)
    }
  }
  window.getUsers = getUsers

  document
    .getElementById('searchUserInput')
    .addEventListener('input', function () {
      const query = this.value.trim().toLowerCase()
      const filtered = userData.filter((u) => {
        const username = removeAccents(u.username).toLowerCase()
        const email = removeAccents(u.email).toLowerCase()
        const createdAt = formatDate(u.createdAt)
        const updatedAt = formatDate(u.updatedAt)
        return (
          username.includes(query) ||
          email.includes(query) ||
          createdAt.includes(query) ||
          updatedAt.includes(query)
        )
      })
      if (filtered.length === 0) {
        userTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">Không có bản ghi nào</td>
        </tr>
      `
      } else {
        renderTable(filtered)
      }
    })

  // update event handler
  async function updateUser(userId) {
    try {
      const modalEl = document.getElementById('updateUserModal')
      if (!modalEl) {
        toastr.error('Không tìm thấy modal.')
        return
      }

      // Lấy thông tin user
      const user = await ajax(`/api/users/${userId}`, {}, 'GET')

      // Đổ roles
      const roles = ['Org', 'Member']
      const roleSelect = document.getElementById('new-role')
      roleSelect.innerHTML = ''
      roles.forEach((r) => {
        const opt = document.createElement('option')
        opt.value = r
        opt.textContent = r
        roleSelect.appendChild(opt)
      })

      // Gán dữ liệu
      document.getElementById('new-username').value = user.username || ''
      document.getElementById('new-email').value = user.email || ''
      document.getElementById('new-role').value = user.role || 'Member'
      document.getElementById('new-password').value = ''
      document.getElementById('new-confirm-password').value = ''

      // Hiển thị modal
      const modal = new bootstrap.Modal(modalEl)
      modal.show()

      // Xử lý submit chỉ một lần
      const form = document.getElementById('updateUserForm')
      const submitHandler = async (e) => {
        e.preventDefault()

        const currentUserId = document.getElementById('currentUserId').value
        const username = document.getElementById('new-username').value.trim()
        const email = document.getElementById('new-email').value.trim()
        const password = document.getElementById('new-password').value.trim()
        const confirmPassword = document
          .getElementById('new-confirm-password')
          .value.trim()
        const role = document.getElementById('new-role').value
        const dataUpdate = { username, email, role }

        const isValidUser = isValidUserAccountName(username, email)
        if (isValidUser) {
          toastr.warning(isValidUser)
          return
        }
        if (role !== user.role && userId === currentUserId) {
          toastr.warning('Bạn không thể tự thay đổi vai trò của mình')
          return
        }
        if ((password && !confirmPassword) || (!password && confirmPassword)) {
          toastr.warning('Vui lòng nhập đầy đủ mật khẩu và xác nhận mật khẩu.')
          return
        }
        if (password && confirmPassword) {
          if (!isValidPassword(password)) {
            toastr.warning(
              'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm ký tự hoa, thường, số và ký tự đặc biệt'
            )
            return
          }
          if (password !== confirmPassword) {
            toastr.warning('Mật khẩu không khớp')
            return
          }
          dataUpdate.password = password
          dataUpdate.confirmPassword = confirmPassword
        }

        try {
          const result = await ajax(
            `/api/users/update/${userId}`,
            dataUpdate,
            'PUT'
          )
          if (result) {
            toastr.success('Cập nhật thành công')
            modal.hide()
            clearForm('update')
            await getUsers()
          }
        } catch (err) {
          toastr.error(err.message)
        }
      }

      // Gỡ event cũ rồi gắn mới (hoặc dùng once)
      form.replaceWith(form.cloneNode(true))
      const newForm = document.getElementById('updateUserForm')
      newForm.addEventListener('submit', submitHandler, { once: true })
    } catch (error) {
      toastr.error(error.message)
    }
  }

  setCheckbox('#userTable', 'userCheckbox')

  // delete users handling
  document
    .getElementById('deleteManyBtn')
    ?.addEventListener('click', deleteUsers)
  const currentUserId = document.getElementById('currentUserId')?.value

  async function deleteUsers() {
    const selectedUsers = [
      ...document.querySelectorAll('.userCheckbox:checked')
    ].map((cb) => cb.dataset.id)

    if (selectedUsers.length === 0) {
      toastr.warning('Vui lòng chọn ít nhất một người dùng để xóa')
      return
    }

    if (selectedUsers.includes(currentUserId)) {
      toastr.warning('Bạn không thể xóa tài khoản của chính mình')
      return
    }

    // Hiển thị modal xác nhận
    showConfirmModal({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn xóa ${selectedUsers.length} thành viên?`,
      onConfirm: async () => {
        try {
          const result = await ajax('/api/users/delete', {
            userIds: selectedUsers
          })
          if (result) {
            toastr.success('Xóa thành công')
            await getUsers()
            selectAll.checked = false
          }
        } catch (error) {
          toastr.error(error.message)
        }
      }
    })
  }
}

// render table
function renderTable(users = []) {
  const tableBody = document.getElementById('userTableBody')
  if (!Array.isArray(users) || users.length === 0) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="t_center">Chưa có bản ghi nào</td>
        </tr>
        `
    return
  }
  tableBody.innerHTML = users
    .map(
      (user) =>
        `<tr>
            <td class="text-center"><input type="checkbox" class="userCheckbox" data-id="${user._id
        }"></td>
            <td><span class="form-control border-0 w-100">${user.username}</span></td>
            <td><span class="form-control border-0 w-100">${user.email}</span></td>
            <td><span class="form-control border-0 w-100">${user.role}</span></td>
            <td><span class="form-control border-0 w-100">${formatDate(user.createdAt)}</span></td>
            <td><span class="form-control border-0 w-100">${formatDate(user.updatedAt)}</span></td>
            <td>
                <button class="updateUserBtn btn btn-outline-info" data-id="${user._id
        }">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
        </tr>`
    )
    .join('')
}

$(document).ready(function () {
  if (signUpForm) {
    listProvinces()
    $('#orgProvince').on('change', function () {
      const provinceId = $(this).val()
      if (provinceId) {
        listCommunes(provinceId)
      } else {
        $('#orgCommune')
          .empty()
          .append('<option value="">— Chọn Xã/ Phường —</option>')
          .prop('disabled', true)
        initSelect2($('#orgCommune'), '— Chọn Xã/ Phường —')
      }
    })
  }
})
