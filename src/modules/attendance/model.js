import mongoose from 'mongoose'

// Session của từng nhân viên trong một ngày
const sessionSchema = new mongoose.Schema({
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    type: { type: String, enum: ['regular', 'overtime', 'holiday'], default: 'regular' },
    note: { type: String, default: '' },
    duration: { type: Number, default: 0 } // phút
}, { _id: false })

// Attendance mỗi nhân viên / ngày
const attendanceSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, set: v => v ? new Date(v.toDateString()) : v }, // yyyy-mm-dd 
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], default: 'present' },
    sessions: { type: [sessionSchema], default: [] }, // nhiều lần check-in/out
    totalRegular: { type: Number, default: 0 },
    totalOvertime: { type: Number, default: 0 },
    totalHoliday: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    note: { type: String, default: '' },
    approved: { type: Boolean, default: false } // admin duyệt
}, {
    collection: "Attendances",
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

attendanceSchema.index({ organization: 1, user: 1, date: 1 }, { unique: true })
attendanceSchema.index({ user: 1, date: 1 })

// Pre-save hook tính tổng thời gian
attendanceSchema.pre('save', function (next) {
    let totalRegular = 0
    let totalOvertime = 0
    let totalHoliday = 0

    // Sắp xếp session theo checkIn
    this.sessions.sort((a, b) => a.checkIn - b.checkIn)

    // Kiểm tra overlap
    for (let i = 0; i < this.sessions.length - 1; i++) {
        if (this.sessions[i].checkOut && this.sessions[i].checkOut > this.sessions[i + 1].checkIn) {
            return next(new Error('Sessions cannot overlap'))
        }
    }

    this.sessions.forEach(s => {
        if (s.checkIn && s.checkOut) {
            const diff = Math.round((s.checkOut - s.checkIn) / 60000) // phút
            s.duration = diff
            if (s.type === 'regular') totalRegular += diff
            if (s.type === 'overtime') totalOvertime += diff
            if (s.type === 'holiday') totalHoliday += diff
        }
    })

    this.totalRegular = totalRegular
    this.totalOvertime = totalOvertime
    this.totalHoliday = totalHoliday
    this.totalDuration = totalRegular + totalOvertime + totalHoliday

    next()
})

const Attendance = mongoose.model('Attendance', attendanceSchema)
export default Attendance
