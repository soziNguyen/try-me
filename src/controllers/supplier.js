import Supplier from "../models/supplier.js"
import responseHelper from "../helpers/responseHelper.js"

export const getAllSuppliers = async (req, res) => {
    try {
         const suppliers = await Supplier.find({ status: 'active' }).select('_id name')
         responseHelper.success(res, suppliers)
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const getSuppliers = async (req, res) => {
    try {
        const draw = parseInt(req.query.draw) || 0
        const start = parseInt(req.query.start) || 0
        const length = parseInt(req.query.length) || 10
        const searchValue = (req.query['search[value]'] || '').trim()

        const sortColumnIndex = req.query['order[0][column]']
        const sortField = req.query[`columns[${sortColumnIndex}][data]`] || 'createdAt'
        const sortOrder = req.query['order[0][dir]'] === 'asc' ? 1 : -1

        const searchableFields = ['code', 'name', 'phone', 'email', 'country', 'address', 'taxId', 'status','note']

        const baseCondition = { status: 'active' } // { status: 'active'}
        const searchCondition = searchValue
            ? {
                ...baseCondition,
                $or: searchableFields.map(field => ({
                    [field]: { $regex: searchValue, $options: 'i' }
                }))
            }
            : baseCondition

        const totalRecords = await Supplier.countDocuments({ status: 'active' })
        const filteredRecords = await Supplier.countDocuments(searchCondition)

        const suppliers = await Supplier.find(searchCondition)
            .sort({ [sortField]: sortOrder })
            .skip(start)
            .limit(length)
            .lean()
        
        return res.json({
            draw: Number(draw),
            recordsTotal: totalRecords,
            recordsFiltered: filteredRecords,
            data: suppliers
        })

    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const createSupplier = async (req, res) => {
    try {
        const newSupplier = new Supplier(req.body)
        await newSupplier.save()
        responseHelper.success(res, null, "Tạo thành công")
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params
        const { code, name, phone, email, country, address, taxId, status, note } = req.body

        const supplier = await Supplier.findById(id)
        if (!supplier) {
            return responseHelper.error(res, "Khách hàng không tồn tại", 404)
        }

        const conditions = []
        if (code !== undefined) conditions.push({ code })
        if (name !== undefined) conditions.push({ name })

        if (conditions.length > 0) {
            const existing = await Supplier.findOne({
                _id: { $ne: id },
                $or: conditions
            })

            if (existing) {
                return responseHelper.error(res, "Mã hoặc tên khách hàng đã tồn tại", 400)
            }
        }

        const dataUpdate = {}
        if (code !== undefined) dataUpdate.code = code 
        if (name !== undefined) dataUpdate.name = name
        if (phone !== undefined) dataUpdate.phone = phone
        if (email !== undefined) dataUpdate.email = email
        if (country !== undefined) dataUpdate.country = country
        if (address !== undefined) dataUpdate.address = address
        if (taxId !== undefined) dataUpdate.taxId = taxId
        if (status !== undefined) dataUpdate.status = status
        if (note !== undefined) dataUpdate.note = note

        const updated = await Supplier.findByIdAndUpdate(id, dataUpdate, { new: true })
        responseHelper.success(res, updated, "Cập nhật thành công")
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const deleteSuppliers = async (req, res) => {
    try {
        const { ids } = req.body

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có nhà cung cấp nào được chọn để xóa", 400)
        }

        const result = await Supplier.updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'inactive' } }
    )

        responseHelper.success(res, result.modifiedCount, 'Xóa thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const restoreSuppliers = async (req, res) => {
    try {
        const { ids } = req.body
        await Supplier.updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'active' } }
        )
        responseHelper.success(res, 'Khôi phục thành công')    
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const forceDeleteSuppliers = async (req, res) => {
    try {
        const { ids } = req.body
        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, 'Không có nhà cung cấp nào được chọn để xóa', 400)
        }

        await Supplier.deleteMany({ _id: { $in: ids } })

        responseHelper.success(res, 'Đã xóa vĩnh viễn các nhà cung cấp thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}
