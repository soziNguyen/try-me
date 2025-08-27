import Attendance from '../attendance/model.js'
import Payroll from './model.js'

export async function generatePayroll(orgId, userId, year, month, hourlyRate = 50000) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const query = { organization: orgId, date: { $gte: start, $lte: end } }
  if (userId) query.user = userId

  const attendances = await Attendance.find(query).populate('user')
  if (!attendances.length) return null

  // Group theo user
  const grouped = {}
  attendances.forEach(a => {
    const uid = a.user._id.toString()
    if (!grouped[uid]) grouped[uid] = []
    grouped[uid].push(a)
  })

  const payrolls = []
  for (const uid in grouped) {
    const userAttendances = grouped[uid]
    let totalMinutes = 0
    const details = userAttendances.map(a => {
      totalMinutes += a.totalDuration
      return {
        attendance: a._id,
        workingMinutes: a.totalDuration,
        dailySalary: (a.totalDuration / 60) * hourlyRate
      }
    })
    const totalSalary = details.reduce((sum, d) => sum + d.dailySalary, 0)

    const payroll = await Payroll.findOneAndUpdate(
      { organization: orgId, user: uid, year, month },
      {
        $set: {
          details,
          totalWorkingMinutes: totalMinutes,
          totalSalary
        }
      },
      { upsert: true, new: true }
    )
    payrolls.push(payroll)
  }

  return payrolls
}