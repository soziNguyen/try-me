import Customer from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const getCustomers = async (req, res) => {
  try {
    const {
      draw = 0,
      start = 0,
      length = 10,
      'search[value]': searchRaw = '',
      'order[0][column]': colIdx,
      'order[0][dir]': dir = 'desc'
    } = req.query

    const searchValue = searchRaw.trim()
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = dir === 'asc' ? 1 : -1
    const organizationId = getCurrentOrg(req)

    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Base filter
    const filter = { organization: organizationId }

    if (searchValue) {
      const orConditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { phone: { $regex: searchValue, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: {
                $dateToString: {
                  format: '%d/%m/%Y %H:%M:%S',
                  date: '$lastOrderDate',
                  timezone: '+07:00'
                }
              },
              regex: searchValue,
              options: 'i'
            }
          }
        }
      ]

      // Search số bằng cách convert sang string
      if (/^\d+$/.test(searchValue)) {
        orConditions.push(
          // Sử dụng $expr để convert number sang string rồi regex
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$totalPoints' },
                regex: searchValue
              }
            }
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$totalOrders' },
                regex: searchValue
              }
            }
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$totalSpent' },
                regex: searchValue
              }
            }
          }
        )
      }

      filter.$or = orConditions
    }

    // Sort object với fallback
    const sortObj = {}
    if (sortField && sortField !== 'undefined') {
      sortObj[sortField] = sortDir
    } else {
      sortObj['createdAt'] = -1 // Default sort by newest
    }

    // Query song song để tiết kiệm thời gian
    const [recordsTotal, recordsFiltered, data] = await Promise.all([
      Customer.countDocuments({ organization: organizationId }),
      Customer.countDocuments(filter),
      Customer.find(filter)
        .sort(sortObj)
        .skip(+start)
        .limit(+length)
        .select('name phone totalPoints totalOrders totalSpent lastOrderDate createdAt') // Chỉ select fields cần thiết
        .lean()
    ])

    return res.json({
      draw: +draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (error) {
    console.error('Error in getCustomers:', error)
    responseHelper.error(res, error.message)
  }
}

export const searchCustomers = async (req, res) => {
  try {
    const { query = '' } = req.query
    const organizationId = getCurrentOrg(req)

    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const regex = new RegExp(query.trim(), 'i')

    const customers = await Customer.find({
      organization: organizationId,
      $or: [{ name: regex }, { phone: regex }]
    })
      .limit(10)
      .select('name phone totalPoints')
      .lean()

    res.json({ data: customers })
  } catch (error) {
    console.error('Error in searchCustomers:', error)
    responseHelper.error(res, error.message)
  }
}
