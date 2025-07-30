import mongoose from "mongoose";

const ingredientCateSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' }
}, 
{
    collection: "IngredientCategories", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);


const IngredientCategory = mongoose.model('IngredientCategory', ingredientCateSchema);
export default IngredientCategory;