import responseHelper from "../helpers/responseHelper.js"
import Warehouse from "../models/warehouse.js"


export const getActiveWarehouses = async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ isActive: 'true' })
        responseHelper.success(res, warehouses)
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const getWareHouses = async (req, res) => {
    try {

    const draw = parseInt(req.query.draw) || 0
    const start = parseInt(req.query.start) || 0
    const length = parseInt(req.query.length) || 10

    const searchValue = (req.query['search[value]'] || '').trim()

    const sortColumnIndex = req.query['order[0][column]']
    const sortField = req.query[`columns[${sortColumnIndex}][data]`] || 'createdAt'
    const sortOrder = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const searchableFields = ['name', 'location', 'manager']

    const baseCondition = { isActive: 'true' }
    const searchCondition = searchValue
    ? {
        ...baseCondition,
        $or: searchableFields.map(field => ({
            [field] : { $regex: searchValue, $options: 'i' }
        }))
    }
    : baseCondition
    
    const totalRecords = await Warehouse.countDocuments(baseCondition)
    const filteredRecords = await Warehouse.countDocuments(searchCondition)

    const warehouses = await Warehouse.find(searchCondition)
        .sort({ [sortField] : sortOrder })
        .skip(start)
        .limit(length)
        .populate('manager', 'username')
        .lean()

    return res.json({
        draw: Number(draw),
        recordsTotal: totalRecords,
        recordsFiltered: filteredRecords,
        data: warehouses
    })
    } catch (error) {
      responseHelper.error(res, error.message)  
    }
}

export const createWareHouse = async (req, res) => {
    try {
        const newWareHouse = new Warehouse(req.body)
        await newWareHouse.save()
        responseHelper.success(res, null, 'Tạo thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const updateWareHouse = async (req, res) => {
    try {
        const { id } = req.params
        const { name, location, manager, isActive } = req.body

        const warehouse = await Warehouse.findById(id)
        if (!warehouse) {
            return responseHelper.error(res, "Nhà kho không tồn tại", 404)
        }

        const nameTrimmed = name?.trim()
        const locationTrimmed = location?.trim()

        if (nameTrimmed || locationTrimmed) {
            const nameToCheck = nameTrimmed ?? warehouse.name
            const locationToCheck = locationTrimmed ?? warehouse.location

            const isExisting = await Warehouse.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${nameToCheck}$`, 'i') },
                location: { $regex: new RegExp(`^${locationToCheck}$`, 'i') }
            });

            if (isExisting) {
                return responseHelper.error(res, `Nhà kho ${nameToCheck} đã tồn tại ở địa điểm ${locationToCheck}`)
            }
        }

        const dataUpdate = {}
        if (name !== undefined) dataUpdate.name = nameTrimmed
        if (location !== undefined) dataUpdate.location = locationTrimmed
        if (manager !== undefined) {
            dataUpdate.manager = manager === "" ? null : manager
          }
        if (isActive !== undefined) dataUpdate.isActive = isActive

        if (Object.keys(dataUpdate).length === 0) return

        const updated = await Warehouse.findByIdAndUpdate(id, dataUpdate, { new: true }).populate('manager', 'username')
        responseHelper.success(res, updated, "Cập nhật thành công")
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const deleteWarehouses = async (req, res) => {
    try {
        const { ids } = req.body

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, "Không có nhà kho nào được chọn để xóa", 400)
        }

        const result = await Warehouse.updateMany(
            { _id: { $in: ids } },
            { $set: { isActive: 'false' } }
    )

        responseHelper.success(res, result.modifiedCount, 'Xóa thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const restoreWarehouses = async (req, res) => {
    try {
        const { ids } = req.body

        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, 'Không có nhà kho nào được chọn để khôi phục', 400)
        }
        
        await Warehouse.updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'active' } }
        )
        responseHelper.success(res, 'Khôi phục thành công')    
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

export const forceDeleteWareHouses = async (req, res) => {
    try {
        const { ids } = req.body
        if (!Array.isArray(ids) || ids.length === 0) {
            return responseHelper.error(res, 'Không có nhà kho nào được chọn để xóa', 400)
        }

        await Warehouse.deleteMany({ _id: { $in: ids } })

        responseHelper.success(res, 'Đã xóa vĩnh viễn các nhà kho thành công')
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}