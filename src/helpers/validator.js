export function isValidUsername(username) {
  if (typeof username !== 'string') {
    return 'Tên đăng nhập phải là chuỗi ký tự.'
  }
  if (username.length < 3) {
    return 'Tên đăng nhập phải chứa ít nhất 3 ký tự.'
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (_).'
  }
  return null // Hợp lệ
}

export function isValidPassword(password) {
  if (typeof password !== 'string') {
    return 'Mật khẩu phải là chuỗi ký tự.'
  }
  if (password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất một chữ in hoa (A-Z).'
  }
  if (!/\d/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất một chữ số (0-9).'
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (ví dụ: !, @, #, $...).'
  }
  return null // Hợp lệ
}

export function isPasswordMatch(password, confirmPassword) {
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp.'
  }
  return null
}

export function formatPhoneNumber(phone) {
  if (!phone) return phone

  // giữ chỉ chữ số
  phone = phone.replace(/\D/g, '')

  // nếu bắt đầu bằng 0 (local), đổi sang 84
  if (phone.startsWith('0')) {
    phone = phone.replace(/^0/, '84')
  }

  // nếu không bắt đầu bằng 84, thêm 84 vào trước
  if (!phone.startsWith('84')) {
    phone = '84' + phone
  }

  return phone
}

/**
 * Các pattern được dùng chung (1 chỗ)
 * - Mobile: 84 + (03[2-9] | 05(2|6|8|9) | 07(0|6|7|8|9) | 8[1-9] | 9[0-9]) + 7 chữ số
 * - Landline: 84 + areaCode (bắt đầu bằng 2, 2 hoặc 3 chữ số) + 7-8 chữ số thuê bao
 * - Toll-free / Premium: 1800 / 1900 theo dạng 6 chữ số thuê bao
 */
const RE_MOBILE = /^84(?:3[2-9]|5(?:2|6|8|9)|7(?:0|6|7|8|9)|8[1-9]|9\d)\d{7}$/
const RE_LANDLINE = /^84(?:2\d{1,2})\d{7,8}$/ // 84 + 2xx/2x + thuê bao 7-8 chữ số
const RE_TOLL_FREE = /^841800\d{4,6}$/ // 84 + 1800 + 4 đến 6 chữ số
const RE_PREMIUM = /^841900\d{4,6}$/ // 84 + 1900 + 4 đến 6 chữ số

export function validatePhoneNumber(phone) {
  if (!phone || phone.trim() === '') return null

  const formattedPhone = formatPhoneNumber(phone)

  // Kiểm tra theo loại
  if (RE_MOBILE.test(formattedPhone)) return null
  if (RE_LANDLINE.test(formattedPhone)) return null
  if (RE_TOLL_FREE.test(formattedPhone)) return null
  if (RE_PREMIUM.test(formattedPhone)) return null

  return 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam'
}

// Validate riêng cho mobile (chỉ chấp nhận di động)
export function validateMobileNumber(phone) {
  if (!phone) return 'Số điện thoại di động là bắt buộc'

  const formattedPhone = formatPhoneNumber(phone)

  if (!RE_MOBILE.test(formattedPhone)) {
    return 'Vui lòng nhập số điện thoại di động Việt Nam hợp lệ'
  }

  return null
}

// Trả về loại số: 'mobile' | 'landline' | 'toll-free' | 'premium' | 'unknown'
export function getPhoneType(phone) {
  if (!phone) return 'unknown'
  const formattedPhone = formatPhoneNumber(phone)

  if (RE_MOBILE.test(formattedPhone)) return 'mobile'
  if (RE_LANDLINE.test(formattedPhone)) return 'landline'
  if (RE_TOLL_FREE.test(formattedPhone)) return 'toll-free'
  if (RE_PREMIUM.test(formattedPhone)) return 'premium'
  return 'unknown'
}

// Hiển thị đẹp hơn: local (0...) hoặc quốc tế (+84 ...)
export function displayPhoneNumber(phone, includeCountryCode = false) {
  if (!phone) return phone
  const formattedPhone = formatPhoneNumber(phone)
  const type = getPhoneType(phone)

  // an toàn: đảm bảo chuỗi đủ dài trước khi slice
  const cc = formattedPhone.slice(0, 2) // '84'
  const rest = formattedPhone.slice(2) // phần sau mã quốc gia

  if (includeCountryCode) {
    if (type === 'mobile') {
      // +84 987 654 321  (10 chữ số sau 84 -> rest.length === 10)
      if (rest.length === 10) {
        return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
      }
      // fallback: chia theo 3-3-rest
      return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
    } else if (type === 'landline') {
      // landline: area code 2-3 chữ số => cố gắng hiển thị +84 xx xxxx xxxx hoặc +84 xxx xxxx xxxx
      if (rest.length >= 9) {
        // thử giả định mã vùng 2 chữ số (ví dụ 24), nếu không hợp lý thì hiển thị fallback
        const area2 = rest.slice(0, 2)
        const sub = rest.slice(2)
        return `+${cc} ${area2} ${sub.slice(0, 4)} ${sub.slice(4)}`
      }
      return `+${cc} ${rest}`
    } else {
      // toll-free / premium / unknown
      return `+${cc} ${rest}`
    }
  } else {
    // local format: thêm leading 0
    const local = '0' + rest
    if (type === 'mobile') {
      if (local.length === 11) {
        return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
      }
      return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
    } else if (type === 'landline') {
      // cố gắng hiển thị 0 + mã vùng (2-3) + phần còn lại
      if (local.length >= 10) {
        const area = local.slice(0, local.length - 7) // phần mã vùng + leading 0
        const sub = local.slice(area.length)
        return `${area} ${sub.slice(0, 4)} ${sub.slice(4)}`
      }
      return local
    } else {
      return local
    }
  }
}

// Validate Tax Code (MST) Việt Nam
export const validateTaxCode = (taxCode) => {
  // Loại bỏ tất cả ký tự không phải số
  const cleanTaxCode = taxCode.replace(/[^0-9]/g, '')

  // Kiểm tra độ dài: hợp lệ nếu từ 10 đến 13 chữ số
  return cleanTaxCode.length >= 10 && cleanTaxCode.length <= 13
}
