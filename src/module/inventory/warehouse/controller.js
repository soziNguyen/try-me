import responseHelper from "../../../helpers/responseHelper.js"
import Warehouse from "./model.js"
import { lookupRef } from "../../../helpers/lookupHelper.js"
import { getCurrentOrg } from '../../../helpers/orgHelper.js'


export const getActiveWarehouses = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    const warehouses = await Warehouse.aggregate([
      { $match: { 
        isActive: true,
        organization: organizationId
        } 
      },
      { $sort: { name: 1 } },
      { $project: { _id: 1, name: 1, location: 1 } }
    ])
    responseHelper.success(res, warehouses)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getWareHouses = async (req, res) => {
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

    // Base pipeline with manager lookup
    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupRef('manager', 'Users')
    ]

    // Add search conditions if search value exists
    if (searchValue) {
      const orConditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { location: { $regex: searchValue, $options: 'i' } },
        { "manager.username": { $regex: searchValue, $options: 'i' } }
      ]

      pipeline.push({ $match: { $or: orConditions } })
    }

    // Get total count
    const recordsTotal = await Warehouse.countDocuments({ organization: organizationId }) 

    // Get filtered count
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await Warehouse.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Build sort object
    const sortObj = {}
    switch (sortField) {
      case 'name':
        sortObj.name = sortDir
        break
      case 'location':
        sortObj.location = sortDir
        break
      case 'manager':
        sortObj['manager.username'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Add sorting, pagination, and projection
    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          name: 1,
          location: 1,
          createdAt: 1,
          isActive: 1,
          manager: {
              _id: "$manager._id",
              username: "$manager.username"
          }
        }
      }
    )

    // Execute the main query
    const data = await Warehouse.aggregate(pipeline)

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

export const createWareHouse = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    const data = {
      ...req.body,
      organization: organizationId,
      createdBy: req.user._id
    }
    const newWareHouse = new Warehouse(data)
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

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    const warehouse = await Warehouse.findOne({
      _id: id,
      organization: organizationId
    })
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
            location: { $regex: new RegExp(`^${locationToCheck}$`, 'i') },
            organization: organizationId
        })

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
    dataUpdate.updatedBy = req.user._id

    if (Object.keys(dataUpdate).length === 0) return

    const updated = await Warehouse.findOneAndUpdate(
      { _id: id, organization: organizationId }, 
      dataUpdate, 
      { new: true })
      .populate('manager', 'username')
      .populate('updatedBy', 'username')
    responseHelper.success(res, updated, "Cập nhật thành công")
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteWarehouses = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

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
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)
      
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có nhà kho nào được chọn để xóa', 400)
    }

    const result = await Warehouse.deleteMany(
      { 
        _id: { $in: ids },
        organization: organizationId
      })

    responseHelper.success(res, { deletedCount: result.deletedCount }, 'Đã xóa vĩnh viễn các nhà kho thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}