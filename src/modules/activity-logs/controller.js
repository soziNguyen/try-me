import ActivityLog from './model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { lookupRef } from '../../helpers/lookupHelper.js'
import dayjs from 'dayjs'

export const getActivityLogs = async (req, res) => {
    try {
        const draw = +req.query.draw || 0
        const start = Math.max(0, +req.query.start || 0)
        const length = Math.max(1, +req.query.length || 10)
        const searchValue = (req.query["search[value]"] || "").trim()
        const colIdx = req.query["order[0][column]"]
        const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
        const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

        const organizationId = getCurrentOrg(req)
        if (!organizationId) return res.status(400).json({ message: "Thiếu thông tin tổ chức" })

        // Base pipeline
        const pipeline = [
            { $match: { organization: organizationId } },
            ...lookupRef('userId', 'Users', { as: 'user' })
        ]

        // Multi-token search
        if (searchValue) {
            const tokens = searchValue.split(/\s+/).filter(Boolean)
            const andConditions = tokens.map(token => {
                const regex = { $regex: token, $options: 'i' }
                return {
                    $or: [
                        {
                            $expr: {
                                $regexMatch: {
                                    input: { $dateToString: { format: "%d/%m/%Y %H:%M:%S", date: "$createdAt", timezone: "+07:00" } },
                                    regex: token,
                                    options: "i"
                                }
                            }
                        },
                        { userName: regex },
                        { description: regex },
                        { status: regex }
                    ]
                }
            })

            pipeline.push({ $match: { $and: andConditions } })
        }

        // Tổng số log chưa filter
        const recordsTotal = await ActivityLog.countDocuments({ organization: organizationId })

        // Số log sau khi filter
        const countPipeline = [...pipeline, { $count: 'count' }]
        const countResult = await ActivityLog.aggregate(countPipeline)
        const recordsFiltered = countResult[0]?.count || 0

        // Sort hợp lệ
        const allowedSort = ['userName', 'description', 'createdAt']
        const sortObj = {}
        sortObj[allowedSort.includes(sortField) ? sortField : 'createdAt'] = sortDir

        // Sort, phân trang, projection
        pipeline.push(
            { $sort: sortObj },
            { $skip: start },
            { $limit: length },
            {
                $project: {
                    _id: 0,
                    createdAt: 1,
                    userName: 1,
                    description: 1,
                    status: 1
                }
            }
        )

        let data = await ActivityLog.aggregate(pipeline)

        // Format ngày
        data = data.map(item => ({
            time: dayjs(item.createdAt).format('DD/MM/YYYY HH:mm:ss'),
            userName: item.userName,
            description: item.description,
            status: item.status
        }))

        return res.json({ draw, recordsTotal, recordsFiltered, data })

    } catch (error) {
        console.error('getActivityLogs error:', error)
        return res.status(500).json({
            draw: +req.query.draw || 0,
            recordsTotal: 0,
            recordsFiltered: 0,
            data: [],
            error: error.message
        })
    }
}
