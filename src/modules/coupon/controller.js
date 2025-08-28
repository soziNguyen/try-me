import Coupon from "./model.js"
import responseHelper from "../../helpers/responseHelper.js"
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const getActiveCoupons = async (req, res) => {
    try {
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const Coupons = await Coupon.find(
            {
                isActive: true,
                organization: organizationId
            })
            .select('_id code')
            .sort({ name: 1 })
        responseHelper.success(res, Coupons)
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
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return responseHelper.error(res, "Ngày bắt đầu không được sau ngày kết thúc", 400)
        }

        if (discountType === 'percent' && (discountValue <= 0 || discountValue > 100)) {
            return responseHelper.error(res, 'Giá trị phần trăm phải nằm trong khoảng 1-100', 400)
        }

        if (discountType === 'amount' && (discountValue <= 0)) {
            return responseHelper.error(res, "Giá trị giảm cố định phải lớn hơn 0", 400)
        }

        if (usageLimit !== null && usedCount > usageLimit) {
            return responseHelper.error(res, "Số lượt đã sử dụng không thể lớn hơn giới hạn cho phép", 400)
        }

        const existedCode = await Coupon.findOne({
            code,
            organization: organizationId,
            _id: { $ne: id }
        })

        if (existedCode) {
            return responseHelper.error(res, "Mã giảm giá này đã tồn tại", 400)
        }

        let dataUpdate = {}
        if (code !== undefined) dataUpdate.code = code
        if (discountType !== undefined) dataUpdate.discountType = discountType
        if (discountValue !== undefined) dataUpdate.discountValue = discountValue
        if (description !== undefined) dataUpdate.description = description
        if (startDate !== undefined) dataUpdate.startDate = startDate
        if (endDate !== undefined) dataUpdate.endDate = endDate
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
