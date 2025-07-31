import mongoose from "mongoose";

const ingredientCateSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, 
{
    collection: "IngredientCategories", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);


const IngredientCategory = mongoose.model('IngredientCategory', ingredientCateSchema);
export default IngredientCategory;