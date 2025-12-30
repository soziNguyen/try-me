import mongoose from 'mongoose'

const Schema = mongoose.Schema

const EInvoiceSchema = new Schema(
  {
    invoiceId: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true },
    lookupCode: { type: String, required: true },
    // Liên kết với Order
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderCode: { type: String, required: true },
    // Chi tiết items từ Order
    items: [
      {
        foodId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        comboId: { type: Schema.Types.ObjectId, ref: 'Combo' },
        name: String,
        quantity: Number,
        price: Number,
        unit: { type: String, default: 'Phần' },
        vatRate: Number,
        amount: Number,
        vatAmount: Number
      }
    ],
    // Số liệu từ Order
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    pointsDiscount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    extraDiscount: { type: Number, default: 0 },
    totalVAT: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: false
    },
    // File & Status
    pdfUrl: String,
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'failed'],
      default: 'draft',
      index: true
    },
    issuedAt: { type: Date, default: Date.now },
    errorMessage: String,
    // Organization & Warehouse
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'EInvoices',
    timestamps: true
  }
)

export default mongoose.model('EInvoice', EInvoiceSchema)
