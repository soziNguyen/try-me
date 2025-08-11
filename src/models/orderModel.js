import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const FoodSchema = new Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true, default: '' },
  imageUrl: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  },
  category: {
    type: String,
    enum: ['main', 'side', 'drink', 'dessert'],
    default: 'main'
  }
}, {
  collection: 'Foods',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

const Food = mongoose.model('Food', FoodSchema);
export default Food;
