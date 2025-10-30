$(document).ready(function () {
  const csrfToken = $('#_csrf').val()
  let isLoadingData = false
  let currentLogo = ''
  let headerContent = ''
  let footerContent = ''

  // Toggle nút preview / xóa logo
  function toggleLogoButtons(hasLogo) {
    $('#previewLogoBtn, #removeLogoBtn').prop('disabled', !hasLogo)
  }

  // Gọi API update
  async function updateField(field, value) {
    if (isLoadingData) return
    try {
      const res = await fetch('/api/invoice/options', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ [field]: value })
      })
      const data = await res.json()
      if (!data.success) {
        toastr.error(data.message || `Lỗi cập nhật ${field}`)
      } else {
        toastr.remove() // Xóa thông báo cũ
        toastr.success('Đã lưu thay đổi')
      }
    } catch (err) {
      console.error('Update error:', err)
    }
  }

  // Upload logo
  async function uploadLogo(file) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: { 'x-csrf-token': csrfToken }
      })
      const data = await res.json()
      if (!data.success) {
        toastr.error(data.message || 'Lỗi upload logo')
        return null
      }
      return '/' + data.file.path.replace(/\\/g, '/')
    } catch (err) {
      console.error('Upload logo error:', err)
      return null
    }
  }

  // Load dữ liệu ban đầu
  async function loadInvoiceOptions() {
    try {
      isLoadingData = true
      const res = await fetch('/api/invoice/options')
      const result = await res.json()

      if (result.success && result.data) {
        const data = result.data
        $('[name="invoiceTitle"]').val(data.invoiceTitle || '')
        $('[name="prefix"]').val(data.prefix || '')

        headerContent = data.header || ''
        footerContent = data.footer || ''

        currentLogo = data.logo || ''
        toggleLogoButtons(!!currentLogo)

        initEditor('#headerEditor', 'header', headerContent)
        initEditor('#footerEditor', 'footer', footerContent)
      }
    } catch (err) {
      console.error('Load invoice options error:', err)
    } finally {
      isLoadingData = false
    }
  }

  // TinyMCE cho header/footer
  function initEditor(el, field, content) {
    tinymce.init({
      selector: el,
      license_key: 'gpl',
      extended_valid_elements: '*[*]', // giữ tất cả attribute và style
      valid_elements: '*[*]', // cho phép nhiều thẻ với style
      verify_html: false,
      entity_encoding: 'raw',
      plugins: 'lists image table code help',
      toolbar:
        'undo redo | formatselect | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image table | code | help',
      setup: (editor) => {
        let initialContent = content || ''
        editor.on('change', () => {
          const currentContent = editor.getContent()
          if (currentContent === initialContent) return // không thay đổi gì => bỏ qua
          updateField(field, currentContent)
          initialContent = currentContent // cập nhật content mới
        })
      },
      init_instance_callback: (editor) => {
        if (content) editor.setContent(content)
      }
    })
  }

  // Thay đổi field input text
  $(document).on('change', '.invoice-field', async function () {
    if (isLoadingData) return
    const name = $(this).attr('name')
    if (name === 'logo') {
      const file = this.files[0]
      if (!file) return
      const url = await uploadLogo(file)
      if (url) {
        currentLogo = url
        toggleLogoButtons(true)
        await updateField('logo', url)
      }
    } else {
      await updateField(name, $(this).val())
    }
  })

  // Preview logo
  $('#previewLogoBtn').on('click', function () {
    if (!currentLogo) return toastr.warning('Chưa có logo')
    $('#logoPreviewImg').attr('src', currentLogo)
    $('#logoPreviewModal').modal('show')
  })

  // Xóa logo
  $('#removeLogoBtn').on('click', function () {
    showConfirmModal({
      title: 'Xóa logo',
      message: 'Bạn muốn xóa logo?',
      confirmed: 'Xóa',
      onConfirm: async function () {
        const res = await fetch('/api/invoice/options', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({ logo: '' })
        })
        const data = await res.json()
        if (data.success) {
          currentLogo = ''
          toggleLogoButtons(false)
          toastr.success('Logo đã được xóa')
        } else {
          toastr.error(data.message || 'Lỗi xóa logo')
        }
      }
    })
  })

  // Load dữ liệu
  loadInvoiceOptions()
})
