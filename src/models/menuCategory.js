import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema({
  name:       { type: String, required: true },
  description:{ type: String, default: '' },
  isActive:   { type: Boolean, default: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: "MenuCategories",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);
export { MenuCategory };
