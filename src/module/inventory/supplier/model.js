import mongoose from 'mongoose'

const supplierSchema = new mongoose.Schema({
    code:    { type: String, default: '' }, // mã nhà cung cấp
    name:    { type: String, default: '' },
    phone:   { type: String, default: '' },
    email:   { type: String, default: '' },
    country: { type: String, default: '' },
    address: { type: String, default: '' },
    taxId:   { type: String, default: '' },
    isActive:   { type: Boolean, default: true },
    note:    { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true }
},
{
    collection: "Suppliers",
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
)

supplierSchema.index(
  { organization: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $exists: true, $ne: "" } }
  }
)

supplierSchema.index(
  { organization: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { name: { $exists: true, $ne: "" } }
  }
)

const Supplier = mongoose.model('Supplier', supplierSchema)
export default Supplier
