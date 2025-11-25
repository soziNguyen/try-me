import { MenuItem } from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { deleteFile } from '../../upload/helper.js'
import { lookupUser, lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import Organization from '../../organization/model.js'
import { getWarehouse } from '../../../helpers/warehouseHelper.js'
import Table from '../../table/model.js'
import { logActivity } from '../../activity-logs/service.js'
import { buildChangeLog } from '../../../helpers/changeLog.js'

export const getActiveMenusForRecipe = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {
      isActive: true,
      organization: organizationId
    }

    const pipeline = [
      ...lookupRef('category', 'MenuCategories', { as: 'category' }),
      { $match: matchCondition },
      { $sort: { name: 1 } },
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          image: 1,
          price: 1,
          description: 1,
          isActive: 1,
          category: {
            _id: '$category._id',
            name: '$category.name'
          }
        }
      }
    ]

    const menu = await MenuItem.aggregate(pipeline)
    responseHelper.success(res, menu)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getActiveMenus = async (req, res) => {
  try {
    let organizationId = getCurrentOrg(req)
    let warehouseFilter = req.warehouseFilter || null

    // Nếu chưa đăng nhập (quét QR) -> lấy từ tableId
    if (!req.isAuthenticated?.() && req.query.tableId) {
      const tableId = req.query.tableId.replace(/\?$/, '')
      const table = await Table.findById(tableId).select('organization warehouse')
      if (!table) return responseHelper.error(res, 'Bàn không tồn tại', 404)

      organizationId = table.organization
      warehouseFilter = table.warehouse
    }

    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {
      isActive: true,
      organization: organizationId
    }

    // Warehouse filtering logic
    if (warehouseFilter) {
      matchCondition.warehouse = warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
    }

    const pipeline = [
      ...lookupRef('category', 'MenuCategories', { as: 'category' }),
      { $match: matchCondition },
      { $sort: { name: 1 } },
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          image: 1,
          price: 1,
          description: 1,
          isActive: 1,
          category: {
            _id: '$category._id',
            name: '$category.name'
          }
        }
      }
    ]

    const menu = await MenuItem.aggregate(pipeline)
    responseHelper.success(res, menu)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getMenus = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const baseMatch = { organization: organizationId }

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      baseMatch.warehouse = req.warehouseFilter
    } else {
      // Admin/Org - sử dụng defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        baseMatch.warehouse = org.defaultWarehouse
      }
    }

    // Base pipeline
    const pipeline = [
      { $match: baseMatch },
      ...lookupRef('category', 'MenuCategories', { as: 'category' }),
      ...lookupUser('createdBy'),
      ...lookupUser('updatedBy')
    ]

    // Add search conditions if search value exists
    if (searchValue) {
      const searchNumber = Number(searchValue)
      const orConditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { description: { $regex: searchValue, $options: 'i' } },
        { 'category.name': { $regex: searchValue, $options: 'i' } }
      ]

      // Add numeric search for stock and expirationDays if searchValue is a number
      if (!isNaN(searchNumber)) {
        orConditions.push({ price: searchNumber })
      }

      pipeline.push({ $match: { $or: orConditions } })
    }

    // Get total count
    const recordsTotal = await MenuItem.countDocuments(baseMatch)

    // Get filtered count
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await MenuItem.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Build sort object
    const sortObj = {}
    switch (sortField) {
      case 'name':
        sortObj.name = sortDir
        break
      case 'category':
      case 'category.name':
        sortObj['category.name'] = sortDir
        break
      case 'price':
        sortObj.price = sortDir
        break
      case 'description':
        sortObj.description = sortDir
        break
      case 'createdBy':
        sortObj['createdBy.username'] = sortDir
        break
      case 'updatedBy':
        sortObj['updatedBy.username'] = sortDir
        break
      case 'isActive':
        sortObj.isActive = sortDir
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
          sku: 1,
          name: 1,
          image: 1,
          price: 1,
          description: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1,
          category: {
            _id: '$category._id',
            name: '$category.name'
          },
          createdBy: {
            username: '$createdBy.username'
          },
          updatedBy: {
            username: '$updatedBy.username'
          }
        }
      }
    )

    // Execute the main query
    const data = await MenuItem.aggregate(pipeline)

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

export const createMenu = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!req.user || !req.user._id) {
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401)
    }

    const warehouse = await getWarehouse(req, organizationId)

    const data = {
      ...req.body,
      createdBy: req.user._id,
      organization: organizationId,
      warehouse
    }

    const newMenu = new MenuItem(data)
    await newMenu.save()

    const saved = await MenuItem.findById(newMenu._id)
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')

    logActivity(
      organizationId,
      req.user._id,
      req.user.username || 'Unknown',
      'CREATE',
      'MENU_ITEM',
      `Thêm mới thực đơn`,
      saved.name,
      'SUCCESS',
      warehouse?._id || null
    )

    responseHelper.success(res, saved, 'Tạo thực đơn thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateMenu = async (req, res) => {
  try {
    const { id } = req.params
    const { sku, image, name, category, price, description, isActive } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Sử dụng helper function
    const warehouse = await getWarehouse(req, organizationId)

    // Build match condition với warehouse
    const matchCondition = {
      _id: id,
      organization: organizationId,
      warehouse
    }

    const menu = await MenuItem.findOne(matchCondition)

    const normalizedName = name?.trim() || null
    const normalizedSku = sku?.trim() || null

    if (normalizedName) {
      const existingName = await MenuItem.findOne({
        _id: { $ne: id },
        warehouse,
        name,
        organization: organizationId
      })

      if (existingName) {
        return responseHelper.error(res, 'Tên món đã tồn tại', 400)
      }
    }

    if (normalizedSku) {
      const existingSku = await MenuItem.findOne({
        _id: { $ne: id },
        warehouse,
        sku,
        organization: organizationId
      })

      if (existingSku) {
        return responseHelper.error(res, 'SKU đã tồn tại', 400)
      }
    }

    const dataUpdate = { updatedBy: req.user._id }

    const oldImage = menu.image
    if (sku !== undefined) dataUpdate.sku = normalizedSku
    if (image !== undefined) dataUpdate.image = image
    if (name !== undefined) dataUpdate.name = normalizedName
    if (category !== undefined) dataUpdate.category = category
    if (price !== undefined) dataUpdate.price = price
    if (description !== undefined) dataUpdate.description = description
    if (isActive !== undefined) dataUpdate.isActive = isActive

    if (Object.keys(dataUpdate).length === 0) return

    const updated = await MenuItem.findOneAndUpdate(matchCondition, dataUpdate, { new: true })
      .populate('category', 'name')
      .populate('createdBy', 'username -_id')
      .populate('updatedBy', 'username -_id')

    if (oldImage && oldImage !== updated.image) {
      try {
        await deleteFile(oldImage)
      } catch (err) {
        console.error('Không xóa được file cũ:', err)
      }
    }

    const changeDetailsMenu = buildChangeLog(
      menu,
      updated,
      [
        { field: 'sku', label: 'SKU' },
        { field: 'name', label: 'Tên thực đơn' },
        { field: 'image', label: 'Ảnh' },
        { field: 'description', label: 'Mô tả' },
        { field: 'price', label: 'Giá' },
        { field: 'isActive', label: 'Trạng thái' }
      ],
      menu.name,
      'thực đơn'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'MENU_ITEM',
      changeDetailsMenu,
      updated.name,
      'SUCCESS',
      warehouse?._id || null
    )

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteMenus = async (req, res) => {
  try {
    const { ids } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có thực đơn nào được chọn để xóa', 400)
    }

    const warehouse = await getWarehouse(req, organizationId)

    // Build match condition với warehouse
    const matchCondition = {
      _id: { $in: ids },
      organization: organizationId,
      warehouse
    }

    // Lấy danh sách để biết ảnh nào cần xóa
    const menusToDelete = await MenuItem.find(matchCondition).lean()

    const result = await MenuItem.deleteMany(matchCondition)

    // Xóa ảnh (nếu có)
    for (const menu of menusToDelete) {
      if (menu.image) {
        try {
          await deleteFile(menu.image)
        } catch (err) {
          console.error(`Không xóa được ảnh của ${menu.name}:`, err)
        }
      }
    }

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'MENU_ITEM',
      `Đã xóa ${result.deletedCount} thực đơn`,
      '',
      'SUCCESS',
      warehouse?._id || null
    )

    responseHelper.success(res, result.deletedCount, 'Xóa thực đơn thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const searchMenus = async (req, res) => {
  try {
    const keyword = (req.query.s || '').trim()
    let organizationId = getCurrentOrg(req)
    let warehouseFilter = req.warehouseFilter || null

    if (!req.isAuthenticated?.() && req.query.tableId) {
      const tableId = req.query.tableId.replace(/\?$/, '') // loại bỏ ? nếu có
      const table = await Table.findById(tableId).select('organization warehouse')
      if (!table) return responseHelper.error(res, 'Bàn không tồn tại', 404)

      organizationId = table.organization
      warehouseFilter = table.warehouse
    }

    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!keyword) return responseHelper.success(res, [])

    // Lấy warehouse nếu chưa có
    if (!warehouseFilter) {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (!org?.defaultWarehouse) {
        return responseHelper.error(res, 'Tổ chức chưa thiết lập kho mặc định', 400)
      }
      warehouseFilter = org.defaultWarehouse
    }

    const searchRegex = new RegExp(keyword, 'i')

    const pipeline = [
      ...lookupRef('category', 'MenuCategories', { as: 'category' }),
      {
        $match: {
          isActive: true,
          organization: organizationId,
          warehouse: warehouseFilter, // lọc theo kho hiện tại
          $or: [{ name: { $regex: searchRegex } }, { sku: { $regex: searchRegex } }]
        }
      },
      { $sort: { name: 1 } },
      { $limit: 50 }, // tránh query quá nặng
      {
        $project: {
          _id: 1,
          sku: 1,
          name: 1,
          image: 1,
          price: 1,
          description: 1,
          isActive: 1,
          category: {
            _id: '$category._id',
            name: '$category.name'
          }
        }
      }
    ]

    const results = await MenuItem.aggregate(pipeline)
    responseHelper.success(res, results)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
