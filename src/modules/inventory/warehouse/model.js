import mongoose from "mongoose"

const warehouseSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  location: { type: String, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default : null }
}, 
{
    collection: "Warehouses", 
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
)

warehouseSchema.index(
  { organization: 1, name: 1, location: 1 },
  {
    unique: true,
    partialFilterExpression: {
      name: { $ne: '' },
      location: { $ne: '' }
    }
  }
)

const Warehouse = mongoose.model('Warehouse', warehouseSchema)
export default Warehouse