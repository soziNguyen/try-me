import mongoose from 'mongoose'

const comboSchema = new mongoose.Schema(
  {
    sku: { type: String, default: '' }, // mã combo
    name: { type: String, required: true }, // tên combo
    image: { type: String, default: '' }, // ảnh đại diện
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
          required: true
        }, // món trong combo
        quantity: { type: Number, default: 1 } // số lượng mỗi món
      }
    ],
    price: { type: Number, required: true }, // giá bán hiện tại
    isActive: { type: Boolean, default: false }, // còn bán hay không
    note: { type: String, default: '' }, // ghi chú nội bộ
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'Combos',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

comboSchema.index(
  { organization: 1, warehouse: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $exists: true, $ne: '' } }
  }
)

comboSchema.index(
  { organization: 1, warehouse: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { name: { $exists: true, $ne: '' } }
  }
)

const Combo = mongoose.model('Combo', comboSchema)
export { Combo }
