import mongoose from 'mongoose'
const Schema = mongoose.Schema

const ReceivingAccountSchema = new Schema(
  {
    name: { type: String, default: '' }, // Tên tài khoản: "Momo công ty", "Vietcombank"
    type: { type: String, enum: ['bank', 'e-wallet'], default: 'bank' }, // Loại: ngân hàng hoặc ví điện tử
    accountNumber: { type: String, default: '' }, // Số tài khoản hoặc ID ví
    bankName: { type: String, default: '' }, // Tên ngân hàng, nếu có
    isActive: { type: Boolean, default: true }, // Có sử dụng được không
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true } // Thuộc tổ chức nào
  },
  {
    collection: 'ReceivingAccounts',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

ReceivingAccountSchema.index({
  name: 'text',
  type: 'text',
  accountNumber: 'text',
  bankName: 'text'
})

export default mongoose.model('ReceivingAccount', ReceivingAccountSchema)
