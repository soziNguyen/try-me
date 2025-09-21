import mongoose from 'mongoose'
const Schema = mongoose.Schema

const PaymentMethodSchema = new Schema(
  {
    name: { type: String, default: '' }, // Tên phương thức: "Tiền mặt", "Momo", ...
    type: {
      type: String,
      enum: ['cash', 'bank', 'card', 'e-wallet'],
      required: true,
      default: 'cash'
    }, // Loại hình
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    config: { type: Object, default: {} }, // Lưu config nếu là cổng thanh toán online
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    receivingAccountId: { type: Schema.Types.ObjectId, ref: 'ReceivingAccount', default: null }, // nếu là bank/e-wallet
    isDefault: { type: Boolean, default: false } // phương thức mặc định
  },
  {
    collection: 'PaymentMethods',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

PaymentMethodSchema.index({ name: 'text', description: 'text', type: 'text' })

export default mongoose.model('PaymentMethod', PaymentMethodSchema)
