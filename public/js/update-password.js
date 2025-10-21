const updatePasswordForm = document.getElementById('update-password-form')

if (updatePasswordForm) {
  // Lấy tất cả các input password và icon tương ứng
  const passwordInputs = updatePasswordForm.querySelectorAll(
    'input[type="password"], input[type="text"]'
  )

  passwordInputs.forEach((input) => {
    const icon = updatePasswordForm.querySelector(`.toggle-password[data-target="${input.id}"]`)

    if (icon) {
      // Xử lý hiển thị icon khi có giá trị
      input.addEventListener('input', function () {
        if (this.value.length > 0) {
          icon.classList.remove('d-none')
        } else {
          icon.classList.add('d-none')
        }
      })
    }
  })

  // Xử lý toggle hiển thị mật khẩu
  document.querySelectorAll('.toggle-password').forEach((icon) => {
    icon.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target')
      const passwordInput = document.getElementById(targetId)

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text'
        this.classList.remove('bi-eye-slash')
        this.classList.add('bi-eye')
      } else {
        passwordInput.type = 'password'
        this.classList.remove('bi-eye')
        this.classList.add('bi-eye-slash')
      }
    })
  })

  updatePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const currentPasswordElement = document.getElementById('currentPassword')
    const newPasswordElement = document.getElementById('new-password')
    const confirmPasswordElement = document.getElementById('new-confirm-password')

    const currentPassword = currentPasswordElement.value.trim()
    const newPassword = newPasswordElement.value.trim()
    const confirmPassword = confirmPasswordElement.value.trim()

    if (currentPassword.length === 0) {
      toastr.remove()
      toastr.warning('Trường này là bắt buộc.')
      currentPasswordElement.focus()
      return
    }
    if (newPassword.length === 0) {
      toastr.remove()
      toastr.warning('Trường này là bắt buộc.')
      newPasswordElement.focus()
      return
    }
    if (confirmPassword.length === 0) {
      toastr.remove()
      toastr.warning('Trường này là bắt buộc.')
      confirmPasswordElement.focus()
      return
    }
    if (!isValidPassword(newPassword)) {
      toastr.remove()
      toastr.warning(
        'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm ký tự hoa, thường, số và ký tự đặc biệt.'
      )
      return
    }
    if (!isValidPassword(newPassword, confirmPassword)) {
      toastr.remove()
      toastr.warning('Mật khẩu không khớp.')
      return
    }
    try {
      const result = await ajax(`/api/users/update-password`, {
        currentPassword,
        newPassword,
        confirmPassword
      })
      if (result) {
        clearForm('update')
        toastr.success('Thay đổi mật khẩu thành công.')
      }
    } catch (error) {
      toastr.error(error.message)
    }
  })
}
