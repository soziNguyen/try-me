import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  quantity: { type: Number, default: 0 },
  thresHold: { type: Number, default: 10 },
  unit: { type: String, default: "" },
  supplier: { type: String },
}, 
{
    collection: "Ingredients", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);


const Ingredient = mongoose.model('Ingredient', IngredientSchema);
export default Ingredient;