export const generateInvoiceCode = async (Model, prefix = 'INV') => {
  // Tìm document mới nhất với prefix, sort theo code
  const lastDoc = await Model.findOne({ code: new RegExp(`^${prefix}\\d+$`) })
    .sort({ code: -1 }) // code lớn nhất trước
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
