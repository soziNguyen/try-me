import mongoose from 'mongoose';

const payrollDetailSchema = new mongoose.Schema({
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', default: null },
    workingMinutes: { type: Number, default: 0 },
    dailySalary: { type: Number, default: 0 }
})

const payrollSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    totalWorkingMinutes: { type: Number, default: 0 },
    totalSalary: { type: Number, default: 0 },
    details: [payrollDetailSchema],
}, { 
    collection: 'Payrolls',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

payrollSchema.index({ organization: 1, user: 1, year: 1, month: 1 }, { unique: true })
payrollSchema.index({ organization: 1, createdAt: -1 })
payrollSchema.index({ organization: 1, year: 1, month: 1 })

export default mongoose.model('Payroll', payrollSchema)