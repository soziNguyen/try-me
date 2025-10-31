import mongoose from 'mongoose'
const Schema = mongoose.Schema

const ReceivingAccountSchema = new Schema(
  {
    bankCode: { type: String, default: '' }, // "VCB", "TCB", "MB", etc.
    bankName: { type: String, default: '' }, // Tên ngân hàng, nếu có
    type: { type: String, enum: ['bank', 'e-wallet'], default: 'bank' }, // Loại: ngân hàng hoặc ví điện tử
    accountNumber: { type: String, default: '' }, // Số tài khoản hoặc ID ví
    name: { type: String, default: '' }, // Tên tài khoản
    isActive: { type: Boolean, default: true }, // Hoạt động
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
