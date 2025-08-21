import mongoose from 'mongoose'

const comboSchema = new mongoose.Schema({
  sku: { type: String, default: '' }, // mã combo
  name: { type: String, required: true }, // tên combo
  image: { type: String, default: '' }, // ảnh đại diện
  description: { type: String, default: '' }, // mô tả combo
  items: [
    {
      menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true }, // món trong combo
      quantity: { type: Number, default: 1 }, // số lượng mỗi món
    }
  ],
  price: { type: Number, required: true }, // giá bán hiện tại
  isActive: { type: Boolean, default: true }, // còn bán hay không
  note: { type: String, default: '' }, // ghi chú nội bộ

  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, 
{
  collection: "Combos",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

comboSchema.index(
  { organization: 1, sku: 1 },
  { 
    unique: true,
    partialFilterExpression: { sku: { $exists: true, $ne: "" } }
  }
)

comboSchema.index(
  { organization: 1, name: 1 },
  { 
    unique: true,
    partialFilterExpression: { name: { $exists: true, $ne: "" } }
  }
)

const Combo = mongoose.model('Combo', comboSchema)
export { Combo }
