const changePasswordModal = document.getElementById('change-password')
const getModal = document.getElementById('updateUserModal1')

changePasswordModal.addEventListener('click', async () => {
  const userId = document.getElementById('currentUserId')?.value
  if (!userId || !getModal)
    return console.error('Invalid current user Id or Modal not found')

  const user = await ajax(`/api/users/${userId}`, {}, 'GET')

  // Cache input elements
  const usernameInput = document.querySelector('#new-username-1')
  const emailInput = document.querySelector('#new-email-1')
  const passwordInput = document.querySelector('#new-password-1')
  const confirmInput = document.querySelector('#new-confirm-password-1')

  // Set input values
  usernameInput.value = user.username || ''
  emailInput.value = user.email || ''
  passwordInput.value = ''
  confirmInput.value = ''

  const bsModal = new bootstrap.Modal(getModal)
  bsModal.show()

  // Replace old button listener
  const btn = document.querySelector('#updateUserBtnForm1')
  const newBtn = btn.cloneNode(true)
  btn.replaceWith(newBtn)

  newBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim()
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()
    const confirm = confirmInput.value.trim()

    // Validate username/email
    const err = isValidUserAccountName(username, email)
    if (err) return toastr.warning(err)

    // Validate password/confirm
    if ((password && !confirm) || (!password && confirm)) {
      ;(password ? confirmInput : passwordInput).focus()
      return toastr.warning('Please fill out this field.')
    }

    if (password) {
      if (!isValidPassword(password)) {
        return toastr.warning(
          'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.'
        )
      }
      if (password !== confirm) {
        confirmInput.focus()
        return toastr.warning('Passwords do not match.')
      }
    }

    const data = {
      username,
      email,
      ...(password && { password, confirmPassword: confirm })
    }

    try {
      const result = await ajax(`/api/users/update/${userId}`, data, 'PUT')
      if (result) {
        toastr.success('Updated')
        bsModal.hide()
        clearForm('update')
        if (typeof getUsers === 'function') await getUsers()
      }
    } catch (e) {
      toastr.error(e.message)
    }
  })
})
