import CouponPlan from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { lookupRef } from '../../helpers/lookupHelper.js'

export const getCouponPlans = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']

    const allowedSortFields = [
      'code',
      'discountType',
      'discountValue',
      'description',
      'startDate',
      'endDate',
      'usageLimit',
      'usedCount',
      'isActive',
      'createdAt'
    ]
    const sortField = allowedSortFields.includes(req.query[`columns[${colIdx}][data]`])
      ? req.query[`columns[${colIdx}][data]`]
      : 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const fieldToSearch = ['code', 'discountType', 'discountValue', 'description']

    // Build aggregation pipeline
    const pipeline = [
      ...lookupRef('applicablePlans', 'Plans', {
        as: 'applicablePlans',
        unwind: false // giữ nguyên mảng, không tách từng phần tử
      })
    ]

    // Nếu có từ khóa tìm kiếm
    if (searchValue) {
      const orConditions = fieldToSearch.map((field) => ({
        [field]: { $regex: searchValue, $options: 'i' }
      }))
      pipeline.push({ $match: { $or: orConditions } })
    }

    // Count filtered
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await CouponPlan.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Count total
    const recordsTotal = await CouponPlan.countDocuments()

    // Sort, skip, limit + chọn field hiển thị
    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          code: 1,
          discountType: 1,
          discountValue: 1,
          description: 1,
          applicablePlans: {
            $map: {
              input: '$applicablePlans',
              as: 'p',
              in: { _id: '$$p._id', name: '$$p.name', code: '$$p.code' }
            }
          },
          startDate: 1,
          endDate: 1,
          usageLimit: 1,
          usedCount: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    )

    const couponPlans = await CouponPlan.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: couponPlans
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getCouponPlanById = async (req, res) => {
  try {
    const { id } = req.params
    const coupon = await CouponPlan.findById(id).populate('applicablePlans', '_id name code')
    if (!coupon) return responseHelper.error(res, 'Không tìm thấy mã giảm giá', 404)
    responseHelper.success(res, coupon)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createCouponPlan = async (req, res) => {
  try {
    const coupon = new CouponPlan(req.body)
    await coupon.save()

    responseHelper.success(res, coupon, 'Tạo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateCouponPlan = async (req, res) => {
  try {
    const { id } = req.params
    const {
      code,
      discountType,
      discountValue,
      description,
      applicablePlans,
      startDate,
      endDate,
      usageLimit,
      usedCount,
      isActive
    } = req.body

    const coupon = await CouponPlan.findById(id)
    if (!coupon) return responseHelper.error(res, 'Không tìm thấy mã giảm giá', 400)

    let normalizedDiscountValue = discountValue === '' ? null : discountValue

    if (
      normalizedDiscountValue !== undefined &&
      normalizedDiscountValue !== null &&
      isNaN(Number(normalizedDiscountValue))
    ) {
      return responseHelper.error(res, 'Giá trị giảm giá phải là số', 400)
    }

    const finalDiscountType = discountType ?? coupon.discountType
    const finalDiscountValue = normalizedDiscountValue ?? coupon.discountValue

    if (finalDiscountValue != null && finalDiscountValue !== '') {
      const value = Number(finalDiscountValue)

      if (!finalDiscountType) {
        return responseHelper.error(res, 'Vui lòng chọn loại giảm giá', 400)
      }

      if (finalDiscountType === 'percent' && (value <= 0 || value > 100)) {
        return responseHelper.error(res, 'Phần trăm giảm phải nằm trong khoảng 1-100', 400)
      }

      if (finalDiscountType === 'amount' && value <= 0) {
        return responseHelper.error(res, 'Giá trị giảm phải lớn hơn 0', 400)
      }
    }

    // Validate ngày
    const finalStartDate = startDate ? new Date(startDate) : new Date(coupon.startDate)
    const finalEndDate = (() => {
      if (endDate) {
        const ed = new Date(endDate)
        if (isNaN(ed.getTime())) throw new Error('Định dạng ngày kết thúc không hợp lệ')
        ed.setHours(23, 59, 59, 999)
        return ed
      }
      const ed = new Date(coupon.endDate)
      ed.setHours(23, 59, 59, 999)
      return ed
    })()

    if (isNaN(finalStartDate.getTime())) {
      return responseHelper.error(res, 'Định dạng ngày bắt đầu không hợp lệ', 400)
    }
    if (isNaN(finalEndDate.getTime())) {
      return responseHelper.error(res, 'Định dạng ngày kết thúc không hợp lệ', 400)
    }
    if (finalStartDate > finalEndDate) {
      return responseHelper.error(res, 'Ngày bắt đầu không được sau ngày kết thúc', 400)
    }

    // Validate usage
    if (usageLimit !== undefined && (isNaN(Number(usageLimit)) || usageLimit < 0)) {
      return responseHelper.error(res, 'Giới hạn sử dụng không hợp lệ', 400)
    }
    if (usedCount !== undefined && (isNaN(Number(usedCount)) || usedCount < 0)) {
      return responseHelper.error(res, 'Số lượt đã sử dụng không hợp lệ', 400)
    }

    const finalUsageLimit = usageLimit ?? coupon.usageLimit
    const finalUsedCount = usedCount ?? coupon.usedCount
    if (finalUsageLimit !== null && finalUsedCount > finalUsageLimit) {
      return responseHelper.error(res, 'Số lượt đã dùng vượt quá giới hạn', 400)
    }

    // Kiểm tra trùng code
    if (code) {
      const existed = await CouponPlan.findOne({ code, _id: { $ne: id } })
      if (existed) return responseHelper.error(res, 'Mã giảm giá đã tồn tại', 400)
    }

    // Chuẩn bị dữ liệu cập nhật
    const dataUpdate = {}
    if (code !== undefined) dataUpdate.code = code
    if (discountType !== undefined) dataUpdate.discountType = discountType
    if (normalizedDiscountValue !== undefined) dataUpdate.discountValue = normalizedDiscountValue
    if (description !== undefined) dataUpdate.description = description
    if (applicablePlans !== undefined) dataUpdate.applicablePlans = applicablePlans
    if (startDate !== undefined) dataUpdate.startDate = finalStartDate
    if (endDate !== undefined) dataUpdate.endDate = finalEndDate
    if (usageLimit !== undefined) dataUpdate.usageLimit = usageLimit
    if (usedCount !== undefined) dataUpdate.usedCount = usedCount
    if (isActive !== undefined) dataUpdate.isActive = isActive

    const updated = await CouponPlan.findByIdAndUpdate(id, dataUpdate, { new: true }).populate(
      'applicablePlans',
      '_id name code'
    )
    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteCouponPlan = async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có mã nào được chọn để xóa', 400)
    }

    const result = await CouponPlan.deleteMany({ _id: { $in: ids } })
    responseHelper.success(res, { deletedCount: result.deletedCount }, 'Xóa thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const applyCouponPlan = async (req, res) => {
  try {
    const { code, totalAmount, planId } = req.body

    if (!code) return responseHelper.error(res, 'Vui lòng nhập mã giảm giá', 400)
    if (!totalAmount) return responseHelper.error(res, 'Thiếu tổng tiền để áp dụng', 400)
    if (!planId) return responseHelper.error(res, 'Thiếu thông tin gói dịch vụ', 400)

    const now = new Date()

    // Tìm mã giảm giá hợp lệ
    const coupon = await CouponPlan.findOne({
      isActive: true,
      code: code.trim(),
      startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: {
        $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }]
      }
    }).lean()

    if (!coupon) {
      return responseHelper.error(res, 'Mã giảm giá không hợp lệ hoặc đã hết hạn', 400)
    }

    // Kiểm tra xem mã có áp dụng cho gói này không
    if (coupon.applicablePlans?.length) {
      const planIdStr = String(planId)
      const isApplicable = coupon.applicablePlans.some((p) => String(p) === planIdStr)
      if (!isApplicable) {
        return responseHelper.error(res, 'Mã giảm giá không hợp lệ hoặc đã hết hạn sử dụng', 400)
      }
    }

    // Tính giảm giá
    let discount = 0
    if (coupon.discountType === 'percent') {
      discount = (totalAmount * coupon.discountValue) / 100
    } else {
      discount = coupon.discountValue
    }

    // Không cho giảm vượt quá tổng tiền
    discount = Math.min(discount, totalAmount)

    // Tính VAT 8% trên số tiền đã giảm
    const subtotalAfterDiscount = totalAmount - discount
    const vatAmount = Math.round(subtotalAfterDiscount * 0.1)
    const totalAfterVAT = subtotalAfterDiscount + vatAmount

    // Trả kết quả về client
    return responseHelper.success(res, {
      couponId: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discount,
      subtotalAfterDiscount, // tiền trước VAT
      vatAmount,
      totalAfterVAT
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
