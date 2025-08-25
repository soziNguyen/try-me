import moment from 'moment-timezone'

/**
 * Chuyển Date sang giờ Hà Nội và format theo pattern
 * @param {Date} date - Ngày cần chuyển
 * @param {string} format - Format muốn xuất, mặc định YYYY-MM-DD HH:mm:ss
 */
export function toVietnamTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return null
  return moment(date).tz('Asia/Ho_Chi_Minh').format(format)
}

export function parseShiftStart(today, startTimeStr) {
  // startTimeStr expected "HH:mm" or "HH:mm:ss"
  const parts = (startTimeStr || '').split(':').map(n => Number(n))
  const sh = parts[0] || 0
  const sm = parts[1] || 0
  const dt = new Date(today)
  dt.setHours(sh, sm, 0, 0)
  return dt
}