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
    const savedPassword = savedRemember ? localStorage.getItem('savedPassword') || '' : ''

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
      toastr.warning('Vui lòng nhập đầy đủ thông tin')
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
  const accountTypeSelect = document.getElementById('accountType')

  const accType = {
    shop: 'Siêu thị, cửa hàng',
    food: 'Nhà hàng, quán ăn',
    drink: 'Đồ uống, cafe'
  }

  for (const [key, label] of Object.entries(accType)) {
    const option = document.createElement('option')
    option.value = key
    option.textContent = label
    accountTypeSelect.appendChild(option)
  }

  signUpForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    // Lấy data từ form organization + admin
    const formData = new FormData(signUpForm)
    const data = {
      taxCode: formData.get('taxCode'),
      orgName: formData.get('orgName'),
      orgEmail: formData.get('orgEmail'),
      orgPhone: formData.get('orgPhone'),
      orgProvince: formData.get('orgProvince'),
      orgCommune: formData.get('orgCommune'),
      orgStreet: formData.get('orgStreet'),
      adminUsername: formData.get('adminUsername'),
      adminEmail: formData.get('adminEmail'),
      adminPassword: formData.get('adminPassword'),
      accountType: formData.get('accountType')
    }

    const confirmPassword = formData.get('confirmPassword')

    // Validate
    if (data.adminPassword !== confirmPassword) {
      toastr.warning('Mật khẩu không khớp')
      return
    }

    const requiredFields = {
      orgName: data.orgName,
      orgEmail: data.orgEmail,
      orgPhone: data.orgPhone,
      orgProvince: data.orgProvince,
      orgCommune: data.orgCommune,
      orgStreet: data.orgStreet,
      adminUsername: data.adminUsername,
      adminEmail: data.adminEmail,
      adminPassword: data.adminPassword,
      accountType: data.accountType
    }

    if (Object.values(requiredFields).some((value) => !value)) {
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
    paginationHandle(getUsers)
    await getActiveWarehouses()
    await addUser()
  })

  document.getElementById('userTableBody').addEventListener('click', async (event) => {
    const btn = event.target.closest('.updateUserBtn')
    if (btn) {
      const userId = btn.getAttribute('data-id')
      if (userId) {
        await updateUser(userId)
      }
    }
  })

  /**
   * [GET] active warehouse
   */

  let warehouses = []
  const getActiveWarehouses = async () => {
    try {
      const result = await ajax('/api/inventory/warehouse/all', {}, 'GET')
      if (!result) {
        toastr.error('Không thể lấy thông tin nhà kho')
      }
      warehouses = result
    } catch (error) {
      console.error(error)
    }
  }

  async function addUser() {
    const newUserModal = showModal('newUserModal') || null
    const newUser = document.querySelector('#newUser')
    const form = document.getElementById('newUserForm')
    const warehouse = document.getElementById('warehouse1')

    if (newUser && newUserModal) {
      newUser.addEventListener('click', function () {
        warehouse.innerHTML = '<option value="">Chọn kho</option>'
        warehouses.forEach((wh) => {
          const option = document.createElement('option')
          option.value = wh._id
          option.textContent = wh.name
          warehouse.appendChild(option)
        })
        newUserModal.show()
      })
    }

    if (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault()

        const { username, email, password, confirmPassword } = getFormData()
        const checkInPut = validateUserInput(username, email, password, confirmPassword)

        if (checkInPut) {
          toastr.warning(checkInPut)
          return
        }

        if (!warehouse.value) {
          toastr.warning('Vui lòng chọn kho')
          return
        }

        const warehouseId = warehouse.value

        try {
          const result = await ajax('/api/users/create', {
            username,
            email,
            warehouse: warehouseId,
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
  let currentPage = 1
  let perPage = 10
  let totalPages = 1
  let searchKeyword = ''

  document.getElementById('searchUserInput').addEventListener(
    'input',
    debounce(async function () {
      searchKeyword = this.value.trim()
      await getUsers(1)
    }, 500)
  )

  async function getUsers(page = 1) {
    try {
      const params = { page, limit: perPage }
      if (searchKeyword) params.s = searchKeyword

      const response = await ajax('/api/users', params, 'GET')

      if (response) {
        userData = response.data
        currentPage = response.pagination.currentPage
        totalPages = response.pagination.totalPages

        renderTable(userData)
        renderPagination(response.pagination, searchKeyword ? `&s=${searchKeyword}` : '')
        const total = document.getElementById('total-records')
        const hasTotal = total ? `<span>Tổng ${response.pagination.total} bản ghi</span>` : ''
        total.innerHTML = hasTotal

        document.getElementById('selectAll').checked = false
      }
    } catch (error) {
      toastr.error(error.message)
    }
  }

  // update event handler
  async function updateUser(userId) {
    try {
      const user = await ajax(`/api/users/${userId}`, {}, 'GET')

      const roleSelect = document.getElementById('new-role')
      const warehouseGroup = document.getElementById('warehouse-group')
      const warehouseSelect = document.getElementById('warehouse2')

      const roles = [
        { value: 'Org', label: 'Tổ chức' },
        { value: 'Staff', label: 'Nhân viên' },
        { value: 'Kitchen', label: 'Bếp' }
      ]
      roleSelect.innerHTML = roles
        .map(
          (r) =>
            `<option value="${r.value}" ${r.value === (user.role || 'Staff') ? 'selected' : ''}>${r.label}</option>`
        )
        .join('')

      // Đổ kho
      const options = warehouses
        .map(
          (wh) =>
            `<option value="${wh._id}" ${wh._id === user.warehouse?._id ? 'selected' : ''}>${wh.name}</option>`
        )
        .join('')
      warehouseSelect.innerHTML = `<option value="">— Chọn kho —</option>${options}`

      // Toggle field kho với class d-none
      const toggleWarehouse = (role) => {
        warehouseGroup.classList.toggle('d-none', !['Staff', 'Kitchen'].includes(role))
      }
      toggleWarehouse(user.role)

      // Khi đổi role trong modal
      roleSelect.onchange = (e) => {
        toggleWarehouse(e.target.value)
        if (!['Staff', 'Kitchen'].includes(e.target.value)) warehouseSelect.value = ''
      }

      // Gán dữ liệu khác
      document.getElementById('new-username').value = user.username || ''
      document.getElementById('new-email').value = user.email || ''
      document.getElementById('new-password').value = ''
      document.getElementById('new-confirm-password').value = ''

      // Show modal
      const modal = showModal('updateUserModal')
      modal.show()

      // Submit
      const form = document.getElementById('updateUserForm')
      form.onsubmit = async (e) => {
        e.preventDefault()

        const currentUserId = document.getElementById('currentUserId').value
        const username = document.getElementById('new-username').value.trim()
        const email = document.getElementById('new-email').value.trim()
        const password = document.getElementById('new-password').value.trim()
        const confirmPassword = document.getElementById('new-confirm-password').value.trim()
        const role = roleSelect.value
        const warehouse = warehouseSelect.value
        const dataUpdate = { username, email, role }

        // Bắt buộc kho nếu là Staff
        if (['Staff', 'Kitchen'].includes(role) && !warehouse) {
          return toastr.warning('Vui lòng chọn kho cho vai nhân viên')
        }
        if (['Staff', 'Kitchen'].includes(role)) dataUpdate.warehouse = warehouse

        // Chặn tự đổi role
        if (userId === currentUserId && role !== user.role) {
          return toastr.warning('Bạn không thể tự thay đổi vai trò của mình')
        }

        // Validate username/email
        const isValidUser = isValidUserAccountName(username, email)
        if (isValidUser) return toastr.warning(isValidUser)

        // Validate password
        if ((password && !confirmPassword) || (!password && confirmPassword)) {
          return toastr.warning('Nhập đầy đủ mật khẩu và xác nhận mật khẩu')
        }
        if (password && confirmPassword) {
          if (!isValidPassword(password)) return toastr.warning('Mật khẩu không hợp lệ')
          if (password !== confirmPassword) return toastr.warning('Mật khẩu không khớp')
          dataUpdate.password = password
          dataUpdate.confirmPassword = confirmPassword
        }

        // Gửi request
        try {
          const result = await ajax(`/api/users/update/${userId}`, dataUpdate, 'PUT')
          if (result) {
            toastr.success('Cập nhật thành công')
            hideModal('updateUserModal')
            clearForm('update')
            await getUsers()
          }
        } catch (err) {
          toastr.error(err.message)
        }
      }
    } catch (err) {
      toastr.error(err.message)
    }
  }

  setCheckbox('#userTable', 'userCheckbox')

  // delete users handling
  document.getElementById('deleteManyBtn')?.addEventListener('click', deleteUsers)
  const currentUserId = document.getElementById('currentUserId')?.value

  async function deleteUsers() {
    const selectedUsers = [...document.querySelectorAll('.userCheckbox:checked')].map(
      (cb) => cb.dataset.id
    )

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
      okBtnColor: 'danger',
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
function getRoleLabel(role) {
  const roleMap = {
    Admin: 'Quản trị',
    Org: 'Tổ chức',
    Staff: 'Nhân viên',
    Kitchen: 'Bếp'
  }
  return roleMap[role] || role
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
            <td class="text-center"><input type="checkbox" class="userCheckbox" data-id="${
              user._id
            }"></td>
            <td><span class="form-control border-0 w-100">${user.username}</span></td>
            <td><span class="form-control border-0 w-100">${user.email}</span></td>
            <td><span class="form-control border-0 w-100">${user.warehouse?.name ? user.warehouse?.name : ''}</span></td>
            <td><span class="form-control border-0 w-100">${getRoleLabel(user.role)}</span></td>
            <td><span class="form-control border-0 w-100">${formatDate(user.createdAt)}</span></td>
            <td><span class="form-control border-0 w-100">${formatDate(user.updatedAt)}</span></td>
            <td>
                <button class="updateUserBtn btn btn-outline-info" data-id="${user._id}">
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
