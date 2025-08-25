import Payroll from '../models/payroll.js';
import Attendance from '../models/attendance.js';

export async function generatePayroll(organizationId, year, month, ratePerHour = 0) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const data = await Attendance.aggregate([
        {
            $match: {
                organization: new mongoose.Types.ObjectId(organizationId),
                date: { $gte: startDate, $lte: endDate },
            }
        },
        {
            $group: {
                _id: '$user',
                totalRegular: { $sum: '$totalRegular' },
                totalOvertime: { $sum: '$totalOvertime' },
                totalHoliday: { $sum: '$totalHoliday' },
                attendanceIds: { $push: '$_id' }
            }
        }
    ]);

    for (const record of data) {
        const totalMinutes = record.totalRegular + record.totalOvertime + record.totalHoliday;
        const salary = ratePerHour ? (totalMinutes / 60) * ratePerHour : 0;

        await Payroll.findOneAndUpdate(
            { organization: organizationId, user: record._id, year, month },
            {
                $set: {
                    totalRegular: record.totalRegular,
                    totalOvertime: record.totalOvertime,
                    totalHoliday: record.totalHoliday,
                    totalMinutes,
                    salary,
                    details: record.attendanceIds.map(id => ({ attendance: id }))
                }
            },
            { upsert: true, new: true }
        );
    }

    return data.length;
}
