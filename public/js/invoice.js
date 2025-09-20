$(document).ready(function () {
  const csrfToken = $('#_csrf').val()
  let isLoadingData = false // Cờ để tránh gọi API khi đang load dữ liệu

  // Load dữ liệu ban đầu
  async function loadInvoiceOptions() {
    try {
      isLoadingData = true
      const res = await fetch('/api/invoice/options')
      const result = await res.json()

      if (result.success && result.data) {
        const data = result.data

        $('[name="storeName"]').val(data.storeName || '')
        $('[name="invoiceTitle"]').val(data.invoiceTitle || '')
        $('[name="prefixInvoice"]').val(data.prefix || '')
        $('[name="footerLine1"]').val(data.footerLine1 || '')
        $('[name="footerLine2"]').val(data.footerLine2 || '')
        $('[name="hotline"]').val(data.hotline || '')
        $('#orgStreet').val(data.street || '')
        if (data.logo) $('#logoPreview').attr('src', data.logo) // optional preview

        const provinceId = data.province || ''
        const communeId = data.commune || ''

        await listProvinces()
        $('#orgProvince').val(provinceId).trigger('change')

        await listCommunes(provinceId)
        $('#orgCommune').val(communeId).trigger('change')
      } else {
        await listProvinces()
      }
    } catch (error) {
      console.error('Load invoice options error:', error)
    } finally {
      isLoadingData = false
    }
  }

  // Update 1 field bất kỳ
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
        toastr.success(data.message)
      }
    } catch (error) {
      console.error('Update error:', error)
    }
  }

  // Upload logo → trả về URL
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
      // Trả về URL file
      return '/' + data.file.path.replace(/\\/g, '/')
    } catch (error) {
      console.error('Upload logo error:', error)
      return null
    }
  }

  // On change field
  $(document).on('change', '.invoice-field', async function () {
    if (isLoadingData) return

    const name = $(this).attr('name')

    if (name === 'logo') {
      const file = this.files[0]
      if (!file) return
      const url = await uploadLogo(file)
      if (url) {
        $('#logoPreview').attr('src', url) // optional: cập nhật preview
        await updateField('logo', url)
      }
    } else {
      const value = $(this).val()
      if (name === 'orgProvince') {
        listCommunes(value)
        updateField('province', value)
      } else if (name === 'orgCommune') {
        updateField('commune', value)
      } else {
        const map = {
          storeName: 'storeName',
          invoiceTitle: 'invoiceTitle',
          prefixInvoice: 'prefix',
          footerLine1: 'footerLine1',
          footerLine2: 'footerLine2',
          hotline: 'hotline',
          orgStreet: 'street'
        }
        updateField(map[name] || name, value)
      }
    }
  })

  // Không submit form mặc định
  $('#invoiceOptionsForm').on('submit', function (e) {
    e.preventDefault()
  })

  // Reset province button
  function toggleResetProvince() {
    const $province = $('#orgProvince')
    const $resetBtn = $('#resetProvince')
    $resetBtn.prop('disabled', !$province.val())
  }
  $('#orgProvince').on('change', toggleResetProvince)
  toggleResetProvince()
  $('#resetProvince').on('click', function () {
    $('#orgProvince').val('').trigger('change')
    $('#orgStreet').val() ? $('#orgStreet').val('').trigger('change') : ''
  })

  // Load ban đầu
  loadInvoiceOptions()
})
