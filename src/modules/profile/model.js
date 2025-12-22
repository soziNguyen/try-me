import mongoose from 'mongoose'

const Schema = mongoose.Schema

const ProfileSchema = new Schema(
  {
    fullName: { type: String, trim: true, default: '' },
    cccd: { type: String, trim: true, default: '' }, // Căn cước công dân
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    province: { type: String, trim: true, default: '' },
    commune: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    avatar: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date, default: null },
    cccdImages: {
      front: { type: String, trim: true, default: '' }, // Ảnh mặt trước
      back: { type: String, trim: true, default: '' } // Ảnh mặt sau
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    verifiedAt: { type: Date, default: null },
    verificationNote: { type: String, trim: true, default: '' } // Ghi chú khi reject
  },
  {
    collection: 'Profiles',
    timestamps: true
  }
)

const Profile = mongoose.model('Profile', ProfileSchema)
export default Profile
