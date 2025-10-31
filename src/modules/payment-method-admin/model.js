import mongoose from 'mongoose'
const Schema = mongoose.Schema

const PaymentMethodSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    }, // Tên hiển thị, VD: "Thanh toán qua PayOS"

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      enum: ['BANK', 'COD', 'MOMO', 'ZALOPAY', 'VNPAY', 'PAYOS']
    },
    description: {
      type: String,
      default: '',
      trim: true
    },

    icon: {
      type: String,
      default: 'bi-credit-card',
      trim: true
    }, // Bootstrap icon: bi-bank, bi-wallet2, bi-phone...

    isActive: {
      type: Boolean,
      default: true
    },

    sortOrder: {
      type: Number,
      default: 0
    },

    // Thông tin ngân hàng (dùng cho chuyển khoản)
    bankInfo: {
      type: {
        bankCode: { type: String, trim: true, default: '' },
        bankName: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        accountName: { type: String, trim: true, default: '' },
        branchName: { type: String, trim: true, default: '' }
      },
      default: null
    },
    // Cấu hình riêng tùy từng loại
    config: {
      type: Object,
      default: {} // VD: { clientId, apiKey, partnerCode, secretKey... }
    }
  },
  {
    collection: 'AdminPaymentMethods',
    timestamps: true
  }
)

const PaymentMethod = mongoose.model('AdminPaymentMethod', PaymentMethodSchema)
export default PaymentMethod
