import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  location: { type: String, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true }
}, 
{
    collection: "Warehouses", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;