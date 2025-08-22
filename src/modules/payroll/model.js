import mongoose from 'mongoose'

const payrollSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 1-12
    totalHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    salary: { type: Number, default: 0 },
    details: [{
        attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
        hours: Number,
        overtime: Number
    }],
    note: { type: String, default: '' }
}, {
    collection: 'Payrolls',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

payrollSchema.index({ organization: 1, user: 1, year: 1, month: 1 }, { unique: true })

export default mongoose.model('Payroll', payrollSchema)
