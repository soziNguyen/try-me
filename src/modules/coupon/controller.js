import Coupon from "./model.js"
import responseHelper from "../../helpers/responseHelper.js"
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const getActiveCoupons = async (req, res) => {
    try {
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const coupons = await Coupon.find(
            {
                isActive: true,
                organization: organizationId
            })
            .select('_id code')
            .sort({ name: 1 })
        responseHelper.success(res, coupons)
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const getCoupons = async (req, res) => {
    try {
        const draw = +req.query.draw || 0
        const start = +req.query.start || 0
        const length = +req.query.length || 10
        const searchValue = (req.query["search[value]"] || "").trim()
        const colIdx = req.query["order[0][column]"]
        const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
        const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

        const fieldToSearch = ['code', 'discountType', 'discountValue', 'description']

        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const pipeline = [
            { $match: { organization: organizationId } }
        ]

        if (searchValue) {
            const orConditions = fieldToSearch.map(field => ({
                [field]: { $regex: searchValue, $options: "i" }
            }))
            pipeline.push({ $match: { $or: orConditions } })
        }

        const countPipeline = [...pipeline, { $count: "count" }]
        const countResult = await Coupon.aggregate(countPipeline)
        const recordsFiltered = countResult[0]?.count || 0

        const recordsTotal = await Coupon.countDocuments({ organization: organizationId })

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
                    startDate: 1,
                    endDate: 1,
                    usageLimit: 1,
                    usedCount: 1,
                    isActive: 1,
                    organization: 1
                }
            }
        )

        const Coupons = await Coupon.aggregate(pipeline)

        return res.json({
            draw,
            recordsTotal,
            recordsFiltered,
            data: Coupons
        })
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const getCouponById = async (req, res) => {
    try {
        const { id } = req.params
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const coupon = await Coupon.findOne({
            organization: organizationId,
            _id: id
        })

        if (!coupon) return responseHelper.error(res, 'Mã giảm giá không tồn tại', 404)
        responseHelper.success(res, coupon)
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const createCoupon = async (req, res) => {
    try {
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const data = {
            ...req.body,
            organization: organizationId
        }
        const coupon = new Coupon(data)
        await coupon.save()

        responseHelper.success(res, coupon)
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params
        const {
            code, discountType, discountValue, description,
            startDate, endDate, usageLimit, usedCount, isActive
        } = req.body
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const coupon = await Coupon.findOne({
            _id: id,
            organization: organizationId
        })

        if (!coupon) return responseHelper.error(res, 'Mã giảm giá không hợp lệ hoặc đã hết hạn.', 400)

        let normalizedDiscountValue = discountValue
        if (discountValue === '') {
            normalizedDiscountValue = null
        }

        if (normalizedDiscountValue !== undefined && normalizedDiscountValue !== null && isNaN(Number(normalizedDiscountValue))) {
            return responseHelper.error(res, "Giá trị giảm giá phải là số", 400)
        }

        const finalDiscountType = discountType !== undefined ? discountType : coupon.discountType
        const finalDiscountValue = normalizedDiscountValue !== undefined ? normalizedDiscountValue : coupon.discountValue

        if (finalDiscountValue !== null && finalDiscountValue !== undefined && finalDiscountValue !== '') {
            const value = Number(finalDiscountValue)

            if (!finalDiscountType) {
                return responseHelper.error(res, "Vui lòng chọn loại giảm giá", 400)
            }

            if (finalDiscountType === 'percent' && (value <= 0 || value > 100)) {
                return responseHelper.error(res, 'Giá trị phần trăm phải nằm trong khoảng 1-100', 400)
            }

            if (finalDiscountType === 'amount' && (value <= 0)) {
                return responseHelper.error(res, "Giá trị giảm cố định phải lớn hơn 0", 400)
            }
        }

        const finalStartDate = startDate !== undefined ? new Date(startDate) : new Date(coupon.startDate)
        const finalEndDate = (() => {
            if (endDate !== undefined) {
                const ed = new Date(endDate)
                if (isNaN(ed.getTime())) {
                    throw new Error("Định dạng ngày kết thúc không hợp lệ")
                }
                ed.setHours(23, 59, 59, 999)
                return ed
            }
            const ed = new Date(coupon.endDate)
            ed.setHours(23, 59, 59, 999)
            return ed
        })()

        if (startDate !== undefined && isNaN(finalStartDate.getTime())) {
            return responseHelper.error(res, "Định dạng ngày bắt đầu không hợp lệ", 400)
        }

        if (endDate !== undefined && isNaN(finalEndDate.getTime())) {
            return responseHelper.error(res, "Định dạng ngày kết thúc không hợp lệ", 400)
        }

        if (finalStartDate > finalEndDate) {
            return responseHelper.error(res, "Ngày bắt đầu không được sau ngày kết thúc", 400)
        }

        if (usageLimit !== undefined && isNaN(Number(usageLimit))) {
            return responseHelper.error(res, 'Giới hạn sử dụng phải là một số', 400)
        }

        if (usageLimit !== undefined && usageLimit !== null && usageLimit < 0) {
            return responseHelper.error(res, "Giới hạn sử dụng không thể âm", 400)
        }

        if (usedCount !== undefined && isNaN(Number(usedCount))) {
            return responseHelper.error(res, 'Số lượt đã sử dụng phải là một số', 400)
        }

        if (usedCount !== undefined && usedCount < 0) {
            return responseHelper.error(res, "Số lượt đã sử dụng không thể âm", 400)
        }

        const finalUsageLimit = usageLimit !== undefined ? usageLimit : coupon.usageLimit
        const finalUsedCount = usedCount !== undefined ? usedCount : coupon.usedCount

        if (finalUsageLimit !== null && finalUsedCount > finalUsageLimit) {
            return responseHelper.error(res, "Số lượt đã sử dụng không thể lớn hơn giới hạn cho phép", 400)
        }

        if (code !== undefined) {
            const existedCode = await Coupon.findOne({
                code,
                organization: organizationId,
                _id: { $ne: id }
            })

            if (existedCode) {
                return responseHelper.error(res, "Mã giảm giá này đã tồn tại", 400)
            }
        }

        let dataUpdate = {}
        if (code !== undefined) dataUpdate.code = code
        if (discountType !== undefined) dataUpdate.discountType = discountType
        if (normalizedDiscountValue !== undefined) dataUpdate.discountValue = normalizedDiscountValue
        if (description !== undefined) dataUpdate.description = description
        if (startDate !== undefined) {
        const sd = new Date(startDate)
        const now = new Date()
        sd.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
        dataUpdate.startDate = sd
        }
        if (endDate !== undefined) dataUpdate.endDate = finalEndDate
        if (usageLimit !== undefined) dataUpdate.usageLimit = usageLimit
        if (usedCount !== undefined) dataUpdate.usedCount = usedCount
        if (isActive !== undefined) dataUpdate.isActive = isActive

        const updated = await Coupon.findOneAndUpdate(
            { _id: id, organization: organizationId },
            dataUpdate,
            { new: true }
        )

        responseHelper.success(res, updated, 'Cập nhật thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const deleteCoupons = async (req, res) => {
    try {
        const { ids } = req.body

        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có mã nào được chọn để xóa", 400)
        }

        const result = await Coupon.deleteMany({
            _id: { $in: ids },
            organization: organizationId
        })

        responseHelper.success(res, result.deletedCount, 'Xóa thành công')
    } catch (err) {
        return responseHelper.error(res, err.message)
    }
}

export const applyCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body
    if (!code) return responseHelper.error(res, "Vui lòng nhập mã giảm giá", 400)
    if (totalAmount == null) return responseHelper.error(res, "Thiếu tổng tiền để áp dụng", 400)

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    const now = new Date()
    const coupon = await Coupon.findOneAndUpdate(
    {
        isActive: true,
        code,
        startDate: { $lte: now },
        endDate: { $gte: now },
        organization: organizationId,
        $expr: { $lt: ["$usedCount", "$usageLimit"] }
    },
    { $inc: { usedCount: 1 } },
    { new: true }
    )

    console.log(coupon)
    
    if (!coupon) return responseHelper.error(res, "Mã giảm giá không hợp lệ hoặc đã hết hạn", 400)

    let discount = 0
    if (coupon.discountType === "percent") {
      discount = (totalAmount * coupon.discountValue) / 100
    } else if (coupon.discountType === "amount") {
      discount = coupon.discountValue
    }

    // Giảm không vượt quá tổng tiền
    if (discount > totalAmount) discount = totalAmount
    
    // Trả về thông tin giảm giá
    responseHelper.success(res, {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discount
    })

  } catch (error) {
    responseHelper.error(res, error.message)
  }
}