import responseHelper from '../../helpers/responseHelper.js'
import Plan from './model.js'
import Organization from '../organization/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import CouponPlan from '../coupon-plan/model.js'
import PlanTransaction from '../plan-transaction/model.js'

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
      case 'code':
        sortObj.code = sortDir
        break
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

export const getPlanByCode = async (req, res) => {
  try {
    const { code } = req.params
    if (!code) return responseHelper.error(res, 'Thiếu mã gói', 400)

    const plan = await Plan.findOne({ code }).lean()
    if (!plan) return responseHelper.error(res, 'Không tìm thấy gói', 404)

    responseHelper.success(res, plan)
  } catch (error) {
    responseHelper.error(res, error.message)
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

    return responseHelper.success(res, plan)
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Tạo gói mới (dành cho admin)
export const createPlan = async (req, res) => {
  try {
    const newPlan = new Plan(req.body)

    await newPlan.save()
    return responseHelper.success(res, newPlan)
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

// Cập nhật gói (dành cho admin)
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params
    const {
      level,
      code,
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

    // Nếu cập nhật tên, mã gói
    if (code && code.trim().toUpperCase() !== plan.code) {
      const existingCode = await Plan.findOne({ code: code.trim().toUpperCase(), _id: { $ne: id } })
      if (existingCode) {
        return responseHelper.error(res, 'Mã gói đã tồn tại', 409)
      }
    }

    if (name && name.trim().toUpperCase() !== plan.name) {
      const existingPlan = await Plan.findOne({ name: name.trim().toUpperCase(), _id: { $ne: id } })
      if (existingPlan) {
        return responseHelper.error(res, 'Tên gói đã tồn tại', 409)
      }
    }

    // Cập nhật các
    if (level) plan.level = level
    if (code) plan.code = code.trim().toUpperCase()
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

    const inUse = await Organization.exists({ plan: { $in: ids } })

    if (inUse) {
      return responseHelper.error(res, 'Không thể xóa vì có tổ chức đang sử dụng gói này', 400)
    }

    const result = await Plan.deleteMany({ _id: { $in: ids } })

    return responseHelper.success(res, result.deletedCount, 'Xóa vĩnh viễn gói thành công')
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}

export const upgradePlan = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    const { planId, mode, couponCode } = req.body // mode: 'month' | 'year'
    const now = new Date()

    if (!organizationId) {
      return responseHelper.error(res, 'Không tìm thấy tổ chức hiện tại', 400)
    }

    if (!planId) {
      return responseHelper.error(res, 'Thiếu ID gói dịch vụ', 400)
    }

    // Tìm gói dịch vụ đang hoạt động
    const plan = await Plan.findOne({ _id: planId, isActive: true })
    if (!plan) {
      return responseHelper.error(res, 'Gói dịch vụ không hợp lệ hoặc đã ngừng hoạt động', 404)
    }

    // Lấy tổ chức hiện tại
    const org = await Organization.findById(organizationId).populate('plan')
    if (!org) {
      return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)
    }

    // Kiểm tra nếu cùng gói hoặc hạ cấp
    if (org.plan && org.plan.code === plan.code) {
      return responseHelper.error(res, 'Bạn đang sử dụng gói này rồi', 400)
    }

    if (org.plan && org.plan.level >= plan.level) {
      return responseHelper.error(res, 'Không thể hạ cấp sang gói thấp hơn', 400)
    }

    // Tính giá
    const basePrice = mode === 'year' ? plan.priceYear : plan.priceMonth
    let discountAmount = 0
    let couponUsed = null

    if (couponCode) {
      const coupon = await CouponPlan.findOneAndUpdate(
        {
          isActive: true,
          code: couponCode,
          startDate: { $lte: now },
          endDate: { $gte: now },
          $expr: {
            $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }]
          }
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      )

      if (!coupon) {
        return responseHelper.error(
          res,
          'Mã giảm giá không còn hợp lệ hoặc đã hết lượt sử dụng',
          400
        )
      }

      if (coupon.discountType === 'percent') {
        discountAmount = (basePrice * coupon.discountValue) / 100
      } else if (coupon.discountType === 'amount') {
        discountAmount = coupon.discountValue
      }

      couponUsed = coupon
    }

    const subtotal = Math.max(basePrice - discountAmount, 0)
    const vatRate = 0.08 // VAT 8%
    const vat = subtotal * vatRate
    const total = subtotal + vat

    // Xác định hạn sử dụng
    const expireAt = new Date()
    if (mode === 'year') {
      expireAt.setFullYear(expireAt.getFullYear() + 1)
    } else {
      expireAt.setMonth(expireAt.getMonth() + 1)
    }

    // Cập nhật tổ chức
    org.plan = plan._id
    org.planExpiredAt = expireAt
    org.lastUpgradedAt = now
    await org.save()
    console.log(plan)

    // Lưu lịch sử giao dịch
    await PlanTransaction.create({
      organization: organizationId,
      plan: plan._id,
      mode,
      amount: basePrice,
      discountAmount,
      couponCode: couponUsed?.code || null,
      subtotal,
      vat,
      total,
      paidAt: now,
      expiredAt: expireAt,
      note: `Tổ chức ${org.name} nâng cấp gói ${plan.name}`
    })

    // Trả về
    responseHelper.success(
      res,
      {
        planId: plan._id,
        planName: plan.name,
        planExpiredAt: expireAt,
        total
      },
      'Nâng cấp gói thành công'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
