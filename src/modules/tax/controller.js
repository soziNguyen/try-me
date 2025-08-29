import Tax from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const getTaxes = async (req, res) => {
    try {
        const draw = +req.query.draw || 0
        const start = +req.query.start || 0
        const length = +req.query.length || 10
        const searchValue = (req.query["search[value]"] || "").trim()
        const colIdx = req.query["order[0][column]"]
        const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
        const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const filter = { organization: organizationId }
        if (searchValue) {
            const orConditions = [
                { name: { $regex: searchValue, $options: 'i' } },
                { description: { $regex: searchValue, $options: 'i' } }
            ]

            const num = Number(searchValue)
            if (!isNaN(num)) {
                orConditions.push({ rate: num })
            }
            filter.$or = orConditions
        }

        const recordsTotal = await Tax.countDocuments({ organization: organizationId })
        const recordsFiltered = await Tax.countDocuments(filter)

        const sortObj = {}
        sortObj[sortField] = sortDir

        const data = await Tax.find(filter)
            .sort(sortObj)
            .skip(start)
            .limit(length)
            .lean()

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

export const createTax = async (req, res) => {
    try {
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        const data = {
            ...req.body,
            organization: organizationId
        }

        const tax = new Tax(data)
        await tax.save()
        responseHelper.success(res, tax, 'Tạo thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const updateTax = async (req, res) => {
    try {
        const { id } = req.params
        const { name, rate, description, isActive } = req.body
        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        if (!id) return responseHelper.error(res, 'Thông tin thuế không hợp lệ', 400)

        const tax = await Tax.findOne({
            _id: id,
            organization: organizationId
        })

        if (!tax) return responseHelper.error(res, 'Thuế không tồn tại', 404)
        if (rate !== undefined && isNaN(Number(rate))) {
            return responseHelper.error(res, 'Tỉ lệ phải là một số', 400)
        }

        if (rate !== undefined) {
            const numRate = Number(rate)
            if (isNaN(numRate)) return responseHelper.error(res, 'Tỉ lệ phải là một số', 400)
            if (numRate < 0 || numRate > 100) return responseHelper.error(res, 'Tỉ lệ phải nằm trong khoảng 1-100', 400)
        }

        if (name !== undefined) {
            const existedName = await Tax.findOne({
                _id: { $ne: id },
                organization: organizationId,
                name
            })

            if (existedName) {
                return responseHelper.error(res, 'Tên thuế đã tồn tại', 400)
            }
        }

        let dataUpdate = {}
        if (name !== undefined) dataUpdate.name = name === "" ? "__empty__" : name
        if (rate !== undefined) dataUpdate.rate = rate
        if (description !== undefined) dataUpdate.description = description
        if (isActive !== undefined) dataUpdate.isActive = isActive

        const updated = await Tax.findOneAndUpdate(
            { _id: id, organization: organizationId },
            dataUpdate,
            { new: true })
        responseHelper.success(res, updated, 'Cập nhật thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const deleteTaxes = async (req, res) => {
    try {
        const { ids } = req.body

        const organizationId = getCurrentOrg(req)
        if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có bản ghi nào được chọn để xóa", 400)
        }

        const result = await Tax.deleteMany({
            _id: { $in: ids },
            organization: organizationId
        })

        responseHelper.success(res, result.deletedCount, 'Xóa thành công')
    } catch (err) {
        return responseHelper.error(res, err.message)
    }
}
