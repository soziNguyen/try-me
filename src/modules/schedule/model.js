import mongoose from 'mongoose'

const scheduleSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
    date: { type: Date, set: v => v ? new Date(v.toDateString()) : v }, // yyyy-mm-dd
    status: { type: String, enum: ['scheduled', 'confirmed', 'cancelled'], default: 'scheduled' },
    isRecurring: { type: Boolean, default: false }, // Có lặp lại không (ex: thứ 2 hàng tuần)
    recurringPattern: {
        type: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
        interval: { type: Number, default: 1 }, // Lặp mỗi X (ngày/tuần/tháng)
        daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=CN, 1=T2, ..., 6=T7 (cho weekly)
        endDate: { type: Date } // Ngày kết thúc lặp
    },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin tạo lịch
    approved: { type: Boolean, default: false } // Nhân viên xác nhận lịch
}, {
    collection: "Schedules",
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

const Schedule = mongoose.model('Schedule', scheduleSchema)
export { Schedule }