import mongoose from 'mongoose'

const expenseEntrySchema = new mongoose.Schema(
  {
    code: { type: String, required: true }, // Mã phiếu chi
    date: { type: Date, default: Date.now }, // Ngày chi
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }, // Người tạo
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    }, // Nhà cung cấp
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product', // Hoặc 'Ingredient'
          required: true
        }, // Sản phẩm
        quantity: { type: Number, required: true }, // Số lượng
        unitPrice: { type: Number, required: true }, // Giá
        total: { type: Number, default: 0 } // Tính tự động: quantity * unitPrice
      }
    ],
    note: { type: String, default: '' } // Ghi chú
  },
  {
    collection: 'ExpenseEntries',
    timestamps: true // Tạo createdAt, updatedAt tự động
  }
)

const ExpenseEntry = mongoose.model('ExpenseEntry', expenseEntrySchema)

export { ExpenseEntry }
