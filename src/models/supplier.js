import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
    code:    { type: String, unique: true, sparse: true, default: '' }, // mã nhà cung cấp
    name:    { type: String, default: '' },
    phone:   { type: String, default: '' },
    email:   { type: String, default: '' },
    country: { type: String, default: '' },
    address: { type: String, default: '' },
    taxId:   { type: String, default: '' },
    status:  { type: String, enum: ['active', 'inactive'], default: 'active' },
    note:    { type: String, default: '' },
},
{
    collection: "Suppliers",
    timestamps: { createdAt: 'createdAt', updatedAt : 'updatedAt'}
}
);

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
