import User from '../models/user.js'
import Organization from '../models/organization.js'

export const getAllUsers = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query["search[value]"] || "").trim()
    const colIdx = req.query["order[0][column]"]
    const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
    const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

    // pipeline aggregation
    const pipeline = [
      {
        $lookup: {
          from: "Organizations",
          localField: "organization",
          foreignField: "_id",
          as: "organization"
        }
      },
      { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } }
    ]

    // filter search
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { username: { $regex: searchValue, $options: "i" } },
            { email: { $regex: searchValue, $options: "i" } },
            { role: { $regex: searchValue, $options: "i" } },
            { "organization.name": { $regex: searchValue, $options: "i" } }
          ]
        }
      })
    }

    // count filtered
    const countPipeline = [...pipeline, { $count: "count" }]
    const countResult = await User.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // count total
    const recordsTotal = await User.countDocuments()

    // sort, skip, limit
    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          role: 1,
          organization: { $ifNull: ["$organization.name", ""] },
          createdAt: { $dateToString: { date: "$createdAt", timezone: "Asia/Ho_Chi_Minh", format: "%d-%m-%Y %H:%M:%S" } },
          updatedAt: { $dateToString: { date: "$updatedAt", timezone: "Asia/Ho_Chi_Minh", format: "%d-%m-%Y %H:%M:%S" } }
        }
      }
    )

    const users = await User.aggregate(pipeline)
    console.log(users)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: users
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
