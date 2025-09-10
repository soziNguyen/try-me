import mongoose from 'mongoose'
import { generatePayroll } from '../payroll/service.js'

// Session của từng nhân viên trong một ngày
const sessionSchema = new mongoose.Schema(
  {
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    note: { type: String, default: '' },
    duration: { type: Number, default: 0 } // phút
  },
  { _id: false }
)

// Attendance mỗi nhân viên / ngày
const attendanceSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    date: { type: Date, default: Date.now() }, // yyyy-mm-dd
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave'],
      default: 'present'
    },
    sessions: { type: [sessionSchema], default: [] }, // nhiều lần check-in/out
    totalDuration: { type: Number, default: 0 },
    note: { type: String, default: '' },
    approved: { type: Boolean, default: false } // admin duyệt
  },
  {
    collection: 'Attendances',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
)

attendanceSchema.index({ organization: 1, user: 1, date: 1 }, { unique: true })
attendanceSchema.index({ user: 1, date: 1 })

attendanceSchema.pre('save', function (next) {
  let total = 0
  this.sessions.forEach((s) => {
    if (s.checkIn && s.checkOut) {
      s.duration = Math.round((s.checkOut - s.checkIn) / 60000)
    }
    total += s.duration || 0
  })
  this.totalDuration = total
  next()
})

attendanceSchema.post('save', async function (doc) {
  try {
    const date = new Date(doc.date)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const orgId = doc.organization
    const userId = doc.user

    // Gọi generatePayroll chỉ cho user và tháng này
    await generatePayroll(orgId, userId, year, month)
  } catch {
    // console.error('Auto payroll error (post-save):', _err)
  }
})

const Attendance = mongoose.model('Attendance', attendanceSchema)
export default Attendance
