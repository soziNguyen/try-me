import { MenuCategory } from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupUser } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'

export const getActiveMenuCategory = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const menuCate = await MenuCategory.aggregate([
      {
        $match: {
          isActive: true,
          organization: organizationId
        }
      },
      { $sort: { name: 1 } },
      { $project: { _id: 1, name: 1, description: 1 } }
    ])

    responseHelper.success(res, menuCate)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getMenuCategory = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Base pipeline with manager lookup
    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupUser('createdBy'),
      ...lookupUser('updatedBy')
    ]

    // Add search conditions if search value exists
    if (searchValue) {
      const orConditions = [
        { name: { $regex: searchValue, $options: 'i' } },
        { description: { $regex: searchValue, $options: 'i' } }
      ]

      pipeline.push({ $match: { $or: orConditions } })
    }

    // Get total count
    const recordsTotal = await MenuCategory.countDocuments({
      organization: organizationId
    })

    // Get filtered count
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await MenuCategory.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Build sort object
    const sortObj = {}
    switch (sortField) {
      case 'name':
        sortObj.name = sortDir
        break
      case 'description':
        sortObj.description = sortDir
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
          name: 1,
          description: 1,
          isActive: 1,
          createdAt: 1,
          createdBy: '$createdBy.username',
          updatedBy: '$updatedBy.username'
        }
      }
    )

    // Execute the main query
    const data = await MenuCategory.aggregate(pipeline)

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

export const createMenuCategory = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!req.user || !req.user._id) {
      return responseHelper.error(res, 'Thiếu thông tin người dùng', 401)
    }

    const data = {
      ...req.body,
      createdBy: req.user._id,
      organization: organizationId
    }

    const menuCategory = new MenuCategory(data)
    await menuCategory.save()

    const saved = await MenuCategory.findOne({
      _id: menuCategory._id,
      organization: organizationId
    }).populate('createdBy', 'username -_id')
    responseHelper.success(res, saved, 'Tạo danh mục thực đơn thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateMenuCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, isActive } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const menuCategory = await MenuCategory.findOne({
      _id: id,
      organization: organizationId
    })
    if (!menuCategory) {
      return responseHelper.error(res, 'Danh mục không tồn tại', 404)
    }

    const existing = await MenuCategory.findOne({
      name,
      _id: { $ne: id },
      organization: organizationId
    })
    if (existing) {
      return responseHelper.error(res, 'Danh mục thực đơn đã tồn tại', 400)
    }

    const dataUpdate = { updatedBy: req.user._id }
    if (name !== undefined) dataUpdate.name = name
    if (description !== undefined) dataUpdate.description = description
    if (isActive !== undefined) dataUpdate.isActive = isActive

    if (Object.keys(dataUpdate).length === 0) return

    const updated = await MenuCategory.findOneAndUpdate(
      { _id: id, organization: organizationId },
      dataUpdate,
      { new: true }
    ).populate('updatedBy', 'username -_id')
    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteMenuCategory = async (req, res) => {
  try {
    const { ids } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId)
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(
        res,
        'Không có danh mục nào được chọn để xóa',
        400
      )
    }

    const result = await MenuCategory.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
