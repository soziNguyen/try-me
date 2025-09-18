import mongoose from 'mongoose'

const Schema = mongoose.Schema

const InvoiceOptionsSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    // Header
    logo: { type: String, default: '' },
    storeName: { type: String, default: '' },
    storeAddress: { type: String, default: '' },
    invoiceTitle: { type: String, default: 'HÓA ĐƠN BÁN HÀNG' },
    prefix: { type: String, default: 'HD' },

    // Footer với 2 đoạn
    footerLine1: { type: String, default: 'Xin cảm ơn, hẹn gặp lại quý khách' },
    footerLine2: {
      type: String,
      default:
        'Chúng tôi luôn trân trọng mọi ý kiến đóng góp về chất lượng món ăn và dịch vụ. Xin vui lòng liên hệ với chúng tôi qua hotline:'
    },

    hotline: { type: String, default: '' }
  },
  {
    collection: 'InvoiceOptions',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

const InvoiceOption = mongoose.model('InvoiceOption', InvoiceOptionsSchema)
export default InvoiceOption
