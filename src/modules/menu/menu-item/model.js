import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema(
  {
    sku: { type: String, default: '' },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuCategory',
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
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null
    }
  },
  {
    collection: 'MenuItems',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

menuItemSchema.index(
  { organization: 1, warehouse: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { name: { $ne: null } }
  }
)

menuItemSchema.index(
  { organization: 1, warehouse: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $ne: null } }
  }
)

const MenuItem = mongoose.model('MenuItem', menuItemSchema)
export { MenuItem }
