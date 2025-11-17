export const generateInvoiceCode = async (Model, prefix = 'HD') => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0) // đầu ngày
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999) // cuối ngày

  // Tìm hóa đơn hôm nay có code lớn nhất
  const lastDoc = await Model.findOne({
    code: new RegExp(`^${prefix}\\d+$`),
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  })
    .sort({ code: -1 })
    .lean()

  let lastNumber = 0
  if (lastDoc?.code) {
    const match = lastDoc.code.match(new RegExp(`^${prefix}(\\d+)$`))
    if (match) {
      lastNumber = parseInt(match[1], 10)
    }
  }

  const nextNumber = lastNumber + 1
  const numberPart = String(nextNumber).padStart(12, '0')
  return `${prefix}${numberPart}`
}
