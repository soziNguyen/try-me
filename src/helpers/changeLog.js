/**
 * Xây dựng log thay đổi ngắn gọn: <targetType> 'Tên': Trường cũ -> mới
 * @param {Object} oldObj - bản ghi cũ
 * @param {Object} newObj - bản ghi mới
 * @param {Array<{field: string, label?: string}>} fields - danh sách field cần so sánh
 * @param {string} [targetName] - tên bản ghi
 * @param {string} [targetType] - loại đối tượng, ví dụ 'Danh mục', 'Nguyên liệu', ...
 * @returns {string} - chuỗi log chi tiết
 */
const formatValue = (value) => {
  if (value === true) return 'Kích hoạt'
  if (value === false) return 'Ẩn'

  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export const buildChangeLog = (oldObj, newObj, fields, targetName = '', targetType = '') => {
  if (!oldObj || !newObj || !fields || fields.length === 0) return ''

  const changes = []

  fields.forEach(({ field, label }) => {
    const oldValue = formatValue(oldObj[field])
    const newValue = formatValue(newObj[field])

    if (oldValue !== newValue) {
      const displayLabel = label || field
      changes.push(`${displayLabel}: "${oldValue}" → "${newValue}"`)
    }
  })

  if (changes.length === 0) return

  if (targetName) {
    return targetType
      ? `Cập nhật ${targetType} "${targetName}": ${changes.join(', ')}`
      : `Cập nhật "${targetName}": ${changes.join(', ')}`
  }

  return changes.join(', ')
}
