import mongoose from "mongoose"

const Schema = mongoose.Schema

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // tên tổ chức
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    province: { type: String, trim: true, default: '' }, // tỉnh thành
    commune: { type: String, trim: true, default: '' }, // xã phường
    street: { type: String, trim: true, default: '' }, // địa chỉ cụ thể
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  {
    collection: "Organizations",
    timestamps: true
  }
)

const Organization = mongoose.model("Organization", OrganizationSchema)
export default Organization
