import mongoose from 'mongoose'

const menuCategorySchema = new mongoose.Schema({
  name:       { type: String, default: '' },
  description:{ type: String, default: '' },
  isActive:   { type: Boolean, default: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
}, {
  collection: "MenuCategories",
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

menuCategorySchema.index(
  { organization: 1, name: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { 
      name: { $exists: true, $ne: "" } 
    }
  }
)

const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema)
export { MenuCategory }
