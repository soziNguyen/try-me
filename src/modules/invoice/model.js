import mongoose from 'mongoose'

const Schema = mongoose.Schema

const InvoiceOptionsSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    logo: { type: String, default: '' },
    invoiceTitle: { type: String, default: '' },
    prefix: { type: String, default: '' },
    header: { type: String, default: '' },
    footer: { type: String, default: '' }
  },
  {
    collection: 'InvoiceOptions',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

const InvoiceOption = mongoose.model('InvoiceOption', InvoiceOptionsSchema)
export default InvoiceOption
