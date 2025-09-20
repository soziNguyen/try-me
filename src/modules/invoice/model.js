import mongoose from 'mongoose'

const Schema = mongoose.Schema

const InvoiceOptionsSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },

    // Header
    logo: { type: String, default: '' },
    storeName: { type: String, default: '' },
    province: { type: String, trim: true, default: '' },
    commune: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    invoiceTitle: { type: String, default: '' },
    prefix: { type: String, default: '' },

    // Footer
    footerLine1: { type: String, default: '' },
    footerLine2: { type: String, default: '' },
    hotline: { type: String, default: '' }
  },
  {
    collection: 'InvoiceOptions',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

const InvoiceOption = mongoose.model('InvoiceOption', InvoiceOptionsSchema)
export default InvoiceOption
