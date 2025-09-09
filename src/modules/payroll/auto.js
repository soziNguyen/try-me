import cron from 'node-cron'
import Attendance from '../attendance/model.js'
import { generatePayroll } from './service.js'

// Chạy mỗi ngày lúc 0h
cron.schedule('0 0 * * *', async () => {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const start = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    )
    const end = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59
    )

    const attendances = await Attendance.find({
      date: { $gte: start, $lte: end }
    })

    const userOrgMap = {}
    attendances.forEach((a) => {
      const key = `${a.organization}_${a.user}`
      if (!userOrgMap[key])
        userOrgMap[key] = { org: a.organization, user: a.user }
    })

    for (const key in userOrgMap) {
      const { org, user } = userOrgMap[key]
      const year = yesterday.getFullYear()
      const month = yesterday.getMonth() + 1
      await generatePayroll(org, user, year, month)
    }
  } catch (err) {
    console.error('Cron: Auto payroll error:', err)
  }
})
