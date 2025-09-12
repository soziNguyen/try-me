import mongoose from 'mongoose'
const Schema = mongoose.Schema

const PaymentMethodSchema = new Schema({
  name: { type: String, default: '' },        // Tên phương thức: "Tiền mặt", "Momo", ...
  type: { type: String, enum: ['cash', 'bank', 'card', 'e-wallet'], required: true, default: 'cash' }, // Loại hình: tiền mặt, thẻ, ví điện tử, chuyển khoản
  description: { type: String, default: '' },    // Mô tả thêm
  isActive: { type: Boolean, default: true },    // Có cho phép sử dụng không
  config: { type: Object, default: {} },          // Lưu config nếu là cổng thanh toán online
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true } // Thuộc tổ chức nào
}, {
  collection: 'PaymentMethods',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

PaymentMethodSchema.index({ name: 'text', description: 'text', type: 'text' })

export default mongoose.model('PaymentMethod', PaymentMethodSchema)
