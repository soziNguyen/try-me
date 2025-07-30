import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name:     { type: String, default: '' },
  unit:     { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'IngredientCategory', default: null },
  minStock: { type: Number, default: 0 },
  note:     { type: String, default: '' }
}, 
{
    collection: "Ingredients", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);


const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export default Ingredient;