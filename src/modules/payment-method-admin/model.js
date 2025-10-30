import mongoose from 'mongoose'
const Schema = mongoose.Schema

const PaymentMethodSchema = new Schema(
  {
    name: { type: String, required: true }, // Tên hiển thị, VD: "Thanh toán qua PayOS"
    code: { type: String, required: true, unique: true }, // payos, bank, cod...
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    // Cấu hình riêng tùy từng loại
    config: {
      type: Object,
      default: {} // VD: { bankName, accountNumber, qrImage, clientId, apiKey }
    }
  },
  {
    collection: 'AdminPaymentMethods',
    timestamps: true
  }
)
const PaymentMethod = mongoose.model('AdminPaymentMethod', PaymentMethodSchema)
export default PaymentMethod
