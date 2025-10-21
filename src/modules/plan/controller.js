import responseHelper from '../../helpers/responseHelper.js'
import Plan from './model.js'

// Lấy tất cả các gói (chỉ hiển thị gói active)
export const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ priceMonth: 1 })
    return responseHelper.success(res, plans)
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Lấy tất cả các gói (bao gồm cả inactive - dành cho admin)
export const getAllPlansAdmin = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    // Query gốc
    let query = {}

    // Tìm kiếm
    if (searchValue) {
      const tokens = searchValue.split(/\s+/).filter(Boolean)
      const andConditions = tokens.map((token) => {
        const regex = { $regex: token, $options: 'i' }
        return {
          $or: [{ name: regex }, { description: regex }]
        }
      })
      query = { $and: andConditions }
    }

    // Lấy tổng số bản ghi
    const recordsTotal = await Plan.countDocuments()

    // Lấy số bản ghi đã lọc
    const recordsFiltered = await Plan.countDocuments(query)

    // Xử lý sắp xếp
    const sortObj = {}
    switch (sortField) {
      case 'name':
        sortObj.name = sortDir
        break
      case 'priceMonth':
        sortObj.priceMonth = sortDir
        break
      case 'priceYear':
        sortObj.priceYear = sortDir
        break
      case 'warehouseLimit':
        sortObj.warehouseLimit = sortDir
        break
      case 'staffLimit':
        sortObj.staffLimit = sortDir
        break
      case 'isActive':
        sortObj.isActive = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Thực hiện truy vấn với sắp xếp và phân trang
    const data = await Plan.find(query).sort(sortObj).skip(start).limit(length).lean()

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (error) {
    return res.status(500).json({
      draw: +req.query.draw || 0,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: [],
      error: error.message
    })
  }
}

// Lấy chi tiết một gói theo ID
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params
    const plan = await Plan.findById(id)

    if (!plan) {
      return responseHelper.error(res, 'Không tìm thấy gói', 404)
    }

    return responseHelper.success(res, plan, 'Lấy thông tin gói thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Tạo gói mới (dành cho admin)
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      priceMonth,
      priceYear,
      originalPrice,
      warehouseLimit,
      staffLimit,
      description,
      isActive
    } = req.body

    // Validate dữ liệu
    if (!name) {
      return responseHelper.error(res, 'Tên gói là bắt buộc', 400)
    }

    if (!priceMonth) {
      return responseHelper.error(res, 'Giá theo tháng là bắt buộc', 400)
    }

    if (!priceYear) {
      return responseHelper.error(res, 'Giá theo năm là bắt buộc', 400)
    }

    // Kiểm tra tên gói đã tồn tại chưa
    const existingPlan = await Plan.findOne({ name: name.trim().toUpperCase() })
    if (existingPlan) {
      return responseHelper.error(res, 'Tên gói đã tồn tại', 409)
    }

    const newPlan = new Plan({
      name: name.trim().toUpperCase(),
      priceMonth: priceMonth || 0,
      priceYear: priceYear || 0,
      originalPrice: originalPrice || 0,
      warehouseLimit,
      staffLimit,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true
    })

    await newPlan.save()

    return responseHelper.success(res, newPlan, 'Tạo gói thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Cập nhật gói (dành cho admin)
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      priceMonth,
      priceYear,
      originalPrice,
      warehouseLimit,
      staffLimit,
      description,
      isActive
    } = req.body

    const plan = await Plan.findById(id)
    if (!plan) {
      return responseHelper.error(res, 'Không tìm thấy gói', 404)
    }

    // Nếu cập nhật tên, kiểm tra trùng lặp
    if (name && name.trim().toUpperCase() !== plan.name) {
      const existingPlan = await Plan.findOne({ name: name.trim().toUpperCase(), _id: { $ne: id } })
      if (existingPlan) {
        return responseHelper.error(res, 'Tên gói đã tồn tại', 409)
      }
    }

    // Cập nhật các trường
    if (name) plan.name = name.trim().toUpperCase()
    if (priceMonth !== undefined) plan.priceMonth = priceMonth
    if (priceYear !== undefined) plan.priceYear = priceYear
    if (originalPrice !== undefined) plan.originalPrice = originalPrice
    if (warehouseLimit !== undefined) plan.warehouseLimit = warehouseLimit
    if (staffLimit !== undefined) plan.staffLimit = staffLimit
    if (description !== undefined) plan.description = description
    if (isActive !== undefined) plan.isActive = isActive

    await plan.save()

    return responseHelper.success(res, plan, 'Cập nhật gói thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Xóa vĩnh viễn gói (dành cho admin)
export const hardDeletePlan = async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có gói nào được chọn để xóa', 400)
    }

    const result = await Plan.deleteMany({ _id: { $in: ids } })

    return responseHelper.success(res, result.deletedCount, 'Xóa vĩnh viễn gói thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}
