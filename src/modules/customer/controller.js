import Customer from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { formatPhoneNumber, validatePhoneNumber } from '../../helpers/validator.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

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

    // Query song song
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
    const { search = '' } = req.query
    const organizationId = getCurrentOrg(req)

    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const regex = new RegExp(search.trim(), 'i')

    const customers = await Customer.find({
      organization: organizationId,
      $or: [{ name: regex }, { phone: regex }]
    })
      .limit(10)
      .select('name phone totalPoints')
      .lean()

    responseHelper.success(res, customers)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createCustomer = async (req, res) => {
  try {
    let { name, phone } = req.body
    const organizationId = getCurrentOrg(req)

    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    name = name?.trim()
    phone = phone?.trim()

    if (!phone) {
      return responseHelper.error(res, 'Vui lòng nhập số điện thoại', 400)
    }

    // Validate phone
    const phoneError = validatePhoneNumber(phone)
    if (phoneError) {
      return responseHelper.error(res, phoneError, 400)
    }

    // Format phone sang chuẩn 84xxx
    phone = formatPhoneNumber(phone)

    // Tìm khách hàng đã tồn tại
    let customer = await Customer.findOne({ phone, organization: organizationId })

    if (customer)
      return responseHelper.error(res, 'Khách hàng với số điện thoại này đã tồn tại', 409)

    customer = await Customer.create({
      organization: organizationId,
      name,
      phone
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'CUSTOMER',
      `Thêm mới khách hàng ${name}, Số điện thoại: ${phone}`
    )

    return responseHelper.success(
      res,
      {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalPoints: customer.totalPoints || 0
      },
      'Thêm mới khách hàng thành công'
    )
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

export const getCustomerById = async (req, res) => {
  const { id } = req.params
  if (!id) return responseHelper.error(res, 'ID không hợp lệ', 400)

  const organizationId = getCurrentOrg(req)
  if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

  const customer = await Customer.findOne({
    _id: id,
    organization: organizationId
  })

  if (!customer) return responseHelper.error(res, 'Khách hàng không tồn tại', 404)
  responseHelper.success(res, customer)
}

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params
    let { name, phone } = req.body

    const customerExist = await Customer.findById(id)

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!id) return responseHelper.error(res, 'Khách hàng không tồn tại', 404)

    // Trim dữ liệu
    name = name?.trim()
    phone = phone?.trim()

    // Validate phone nếu có
    if (phone) {
      const phoneError = validatePhoneNumber(phone)
      if (phoneError) {
        return responseHelper.error(res, phoneError, 400)
      }
      // Format phone sang chuẩn 84xxx
      phone = formatPhoneNumber(phone)
    }

    // Kiểm tra phone trùng (nếu có phone mới)
    if (phone) {
      const phoneExisting = await Customer.findOne({
        phone,
        organization: organizationId,
        _id: { $ne: id }
      })

      if (phoneExisting) return responseHelper.error(res, 'Số điện thoại đã tồn tại', 409)
    }

    // Chuẩn bị data update
    const dataUpdate = {}
    if (name !== undefined) dataUpdate.name = name
    if (phone !== undefined) dataUpdate.phone = phone

    const updated = await Customer.findOneAndUpdate({ _id: id }, dataUpdate, {
      new: true,
      runValidators: true
    })

    if (!updated) return responseHelper.error(res, 'Khách hàng không tồn tại', 404)

    const changeDetailsCus = buildChangeLog(
      customerExist,
      updated,
      [
        { field: 'name', label: 'Tên khách hàng' },
        { field: 'phone', label: 'Số điện thoại' }
      ],
      customerExist.name,
      'khách hàng'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'CUSTOMER',
      changeDetailsCus,
      updated.name
    )

    return responseHelper.success(res, updated, 'Cập nhật thông tin khách hàng thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

export const deleteCustomers = async (req, res) => {
  try {
    const { ids } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Vui lòng chọn ít nhất 1 bản ghi để xóa', 400)
    }
    const result = await Customer.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    responseHelper.success(
      res,
      { deletedCount: result.deletedCount },
      `Đã xóa ${result.deletedCount} bản ghi`
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
