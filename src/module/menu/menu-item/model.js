import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema({
  image:       { type: String, default: '' },
  name:        { type: String, required: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  description: { type: String, default: '' },
  currentPrice:{ type: Number, required: true },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: "MenuItems",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

const MenuItem = mongoose.model('MenuItem', menuItemSchema)
export { MenuItem }
