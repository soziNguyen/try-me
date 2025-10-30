import responseHelper from '../../helpers/responseHelper.js'
import Plan from './model.js'
import Organization from '../organization/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import CouponPlan from '../coupon-plan/model.js'
import PlanTransaction from '../plan-transaction/model.js'
import { generateInvoiceCode } from '../../helpers/generateInvoiceCode.js'

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
    const { planId, mode, duration = 1, couponCode } = req.body // mode: month/ year
    const now = new Date()

    if (!organizationId) return responseHelper.error(res, 'Không tìm thấy tổ chức', 400)
    if (!planId) return responseHelper.error(res, 'Thiếu ID gói dịch vụ', 400)

    // Tìm gói dịch vụ đang hoạt động
    const plan = await Plan.findOne({ _id: planId, isActive: true })
    if (!plan)
      return responseHelper.error(res, 'Gói dịch vụ không hợp lệ hoặc đã ngừng hoạt động', 404)

    // Lấy tổ chức hiện tại
    const org = await Organization.findById(organizationId).populate('plan')
    if (!org) return responseHelper.error(res, 'Không tìm thấy tổ chức', 404)

    // Kiểm tra nếu cùng gói hoặc hạ cấp
    if (org.plan && org.plan.code === plan.code)
      return responseHelper.error(res, 'Bạn đang sử dụng gói này rồi', 400)
    if (org.plan && org.plan.level >= plan.level)
      return responseHelper.error(res, 'Không thể hạ cấp sang gói thấp hơn', 400)

    // Tính giá
    const basePrice = mode === 'year' ? plan.priceYear : plan.priceMonth
    const totalBasePrice = basePrice * duration
    let discountAmount = 0
    let couponUsed = null

    // ÁP DỤNG MÃ GIẢM GIÁ
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

      if (!coupon) return responseHelper.error(res, 'Mã giảm giá không hợp lệ', 400)
      couponUsed = coupon
      discountAmount =
        coupon.discountType === 'percent'
          ? (totalBasePrice * coupon.discountValue) / 100
          : coupon.discountValue
    }

    const subtotal = Math.max(totalBasePrice - discountAmount, 0)
    const vatRate = 0.1
    const vat = subtotal * vatRate
    const total = subtotal + vat

    // NGÀY HẾT HẠN DỰ KIẾN
    const expireAt = new Date()
    if (mode === 'year') expireAt.setFullYear(expireAt.getFullYear() + duration)
    else expireAt.setMonth(expireAt.getMonth() + duration)

    // KIỂM TRA ĐƠN HÀNG PENDING
    const existingTransaction = await PlanTransaction.findOne({
      organization: organizationId,
      plan: planId,
      status: 'pending',
      paidAt: null
    }).sort({ createdAt: -1 })

    if (existingTransaction) {
      return responseHelper.success(
        res,
        {
          redirect: `/checkout/${existingTransaction._id}/invoice`,
          transactionId: existingTransaction._id
        },
        'Bạn đã tạo đơn hàng cho gói này trước đó. Đang chuyển đến hóa đơn cũ...'
      )
    }

    // TẠO MỚI TRANSACTION
    const invoiceCode = await generateInvoiceCode(PlanTransaction, 'INV')

    const transaction = await PlanTransaction.create({
      code: invoiceCode,
      organization: organizationId,
      plan: plan._id,
      mode,
      duration,
      amount: totalBasePrice,
      discountAmount,
      couponCode: couponUsed?.code || '',
      subtotal,
      vat,
      total,
      paidAt: null,
      expiredAt: expireAt,
      note: `Tổ chức ${org.name} nâng cấp gói ${plan.name}`,
      status: 'pending'
    })

    responseHelper.success(
      res,
      {
        redirect: `/checkout/${planId}?mode=${mode}`,
        transactionId: transaction._id,
        total
      },
      'Tạo đơn hàng thành công. Đang chuyển đến trang thanh toán...'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const approvePlanTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const transaction = await PlanTransaction.findById(id).populate('organization').populate('plan')

    if (!transaction) return responseHelper.error(res, 'Không tìm thấy giao dịch', 404)
    if (transaction.status !== 'pending')
      return responseHelper.error(res, 'Giao dịch này đã được xử lý', 400)

    // Cập nhật trạng thái
    transaction.status = 'paid'
    transaction.paidAt = new Date()

    // Tính ngày hết hạn lại từ thời điểm thanh toán
    const expireAt = new Date()
    if (transaction.mode === 'year')
      expireAt.setFullYear(expireAt.getFullYear() + transaction.duration)
    else expireAt.setMonth(expireAt.getMonth() + transaction.duration)

    transaction.expiredAt = expireAt
    await transaction.save()

    // Áp dụng gói cho tổ chức
    const org = transaction.organization
    org.plan = transaction.plan._id
    org.planExpiredAt = expireAt
    org.lastUpgradedAt = new Date()
    await org.save()

    responseHelper.success(res, 1, 'Thanh toán thành công. Gói đã được kích hoạt.')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const cancelPlanTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?._id

    const transaction = await PlanTransaction.findById(id)
    if (!transaction) return responseHelper.error(res, 'Không tìm thấy giao dịch', 404)

    // Đơn hàng đã hủy trước đó
    if (transaction.status === 'cancelled') {
      return responseHelper.error(res, 'Đơn hàng đã được hủy trước đó.', 400)
    }
    // Chỉ được hủy khi đang chờ thanh toán
    if (transaction.status !== 'pending') {
      return responseHelper.error(res, 'Chỉ có thể hủy giao dịch khi đang chờ thanh toán')
    }

    // Cập nhật trạng thái và thông tin người hủy
    transaction.status = 'cancelled'
    transaction.cancelledAt = new Date()
    transaction.cancelledBy = userId || null
    await transaction.save()

    return responseHelper.success(res, transaction, 'Hủy giao dịch thành công')
  } catch (err) {
    return responseHelper.error(res, err.message || 'Lỗi hệ thống')
  }
}
