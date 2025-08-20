import mongoose from "mongoose"

const ingredientCateSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true }
}, 
{
    collection: "IngredientCategories", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
)

ingredientCateSchema.index(
  { organization: 1, name: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { 
      name: { $exists: true, $ne: "" } 
    } 
  }
)

const IngredientCategory = mongoose.model('IngredientCategory', ingredientCateSchema)
export default IngredientCategory