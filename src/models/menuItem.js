import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  currentPrice:{ type: Number, required: true },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: "MenuItems",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export { MenuItem };
