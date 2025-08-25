import mongoose from 'mongoose'

const scheduleSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
    date: { type: Date, default: Date.now() }, // yyyy-mm-dd
    status: { type: String, enum: ['scheduled', 'confirmed', 'cancelled'], default: 'scheduled' },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin tạo lịch
    approved: { type: Boolean, default: false } // Nhân viên xác nhận lịch
}, {
    collection: "Schedules",
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

const Schedule = mongoose.model('Schedule', scheduleSchema)
export { Schedule }