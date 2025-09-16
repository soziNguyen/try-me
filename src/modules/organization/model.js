import mongoose from 'mongoose'

const Schema = mongoose.Schema

const OrganizationSchema = new Schema(
  {
    name: { type: String, trim: true }, // tên tổ chức
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    province: { type: String, trim: true, default: '' }, // tỉnh thành
    commune: { type: String, trim: true, default: '' }, // xã phường
    street: { type: String, trim: true, default: '' }, // địa chỉ cụ thể
    logo: { type: String, trim: true, default: '' },
    taxCode: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true }
  },
  {
    collection: 'Organizations',
    timestamps: true
  }
)

OrganizationSchema.index(
  { name: 1 },
  {
    partialFilterExpression: {
      name: { $exists: true, $ne: '' }
    }
  }
)
OrganizationSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $ne: '' }
    }
  }
)
OrganizationSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $ne: '' }
    }
  }
)

const Organization = mongoose.model('Organization', OrganizationSchema)
export default Organization
