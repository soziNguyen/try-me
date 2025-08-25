import mongoose from 'mongoose';

const payrollDetailSchema = new mongoose.Schema({
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
    regularMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    holidayMinutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
});

const payrollSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    totalRegularMinutes: { type: Number, default: 0 },
    totalOvertimeMinutes: { type: Number, default: 0 },
    totalHolidayMinutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    details: [payrollDetailSchema],
}, { timestamps: true });

payrollSchema.index({ organization: 1, user: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.model('Payroll', payrollSchema);
