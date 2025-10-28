import { Combo } from './model.js'
import { deleteFile } from '../../upload/helper.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupUser, lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import Organization from '../../organization/model.js'
import { getWarehouse } from '../../../helpers/warehouseHelper.js'

export const getActiveCombos = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {
      isActive: true,
      organization: organizationId
    }

    // Warehouse filtering logic
    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      matchCondition.warehouse = req.warehouseFilter
    } else {
      // Admin/Org - sử dụng defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
    }
    const combo = await Combo.find(matchCondition).populate('items.menuItem', '_id name')
    responseHelper.success(res, combo)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getCombos = async (req, res) => {
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

    // base pipeline
    let pipeline = [
      { $match: baseMatch },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.menuItem', 'MenuItems', { as: 'menuItem' }),
      ...lookupUser('createdBy')
    ]

    // search
    if (searchValue) {
      const searchNumber = Number(searchValue)
      const orConditions = [
        { sku: { $regex: searchValue, $options: 'i' } },
        { name: { $regex: searchValue, $options: 'i' } },
        { description: { $regex: searchValue, $options: 'i' } },
        { 'menuItem.name': { $regex: searchValue, $options: 'i' } }
      ]
      if (!isNaN(searchNumber)) {
        orConditions.push({ price: searchNumber })
      }
      pipeline.push({ $match: { $or: orConditions } })
    }

    // group lại để gom combo
    pipeline.push(
      {
        $addFields: {
          'items.menuItem': {
            _id: '$menuItem._id',
            name: '$menuItem.name'
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          sku: { $first: '$sku' },
          name: { $first: '$name' },
          image: { $first: '$image' },
          price: { $first: '$price' },
          createdBy: { $first: '$createdBy.username' },
          note: { $first: '$note' },
          items: { $push: '$items' },
          createdAt: { $first: '$createdAt' }
        }
      }
    )

    // tổng số record
    const recordsTotal = await Combo.countDocuments(baseMatch)

    // tổng số record sau filter
    const countFiltered = await Combo.aggregate(pipeline.concat([{ $count: 'count' }]))
    const recordsFiltered = countFiltered[0]?.count || 0

    // sort + skip + limit
    pipeline = pipeline.concat([
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length }
    ])

    const data = await Combo.aggregate(pipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const createCombo = async (req, res) => {
  try {
    const { sku, name, image, items, price, note } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    if (!name || !price) return responseHelper.error(res, 'Tên combo và giá bán là bắt buộc', 400)

    if (!Array.isArray(items) || items.length === 0)
      return responseHelper.error(res, 'Combo phải có ít nhất 1 món ăn', 400)

    for (const it of items) {
      if (!it.menuItem || typeof it.quantity !== 'number' || it.quantity <= 0) {
        return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin và số lượng > 0', 400)
      }
    }

    const existing = await Combo.findOne({
      organization: organizationId,
      warehouse,
      $or: [{ name }, { sku }]
    })
    if (existing) return responseHelper.error(res, 'SKU hoặc name đã tồn tại', 400)

    const combo = new Combo({
      sku,
      name,
      image,
      items,
      price,
      note,
      organization: organizationId,
      createdBy: req.user._id,
      warehouse
    })

    await combo.save()
    await combo.populate('items.menuItem', '_id name')

    responseHelper.success(res, combo, 'Tạo combo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateCombo = async (req, res) => {
  try {
    const { id } = req.params
    const { sku, name, image, items, price, note } = req.body
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!id) return responseHelper.error(res, 'Thiếu ID công thức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    // Build match condition với warehouse
    const matchCondition = {
      _id: id,
      organization: organizationId,
      warehouse
    }

    const existing = await Combo.findOne({
      _id: { $ne: id },
      organization: organizationId,
      warehouse,
      $or: [{ name }, { sku }]
    })

    if (existing) return responseHelper.error(res, 'SKU hoặc name đã tồn tại', 400)

    if (!Array.isArray(items) || items.length === 0) {
      return responseHelper.error(res, 'Combo phải có ít nhất 1 món ăn', 400)
    }

    for (const it of items) {
      if (!it.menuItem || !it.quantity) {
        return responseHelper.error(res, 'Vui lòng điền đầy đủ thông tin', 400)
      }
      if (Number(it.quantity) <= 0) {
        return responseHelper.error(res, 'Số lượng phải lớn hơn 0', 400)
      }
    }

    // Lấy combo cũ để so sánh ảnh
    const combo = await Combo.findOne(matchCondition)
    if (!combo) return responseHelper.error(res, 'Không tìm thấy công thức', 404)

    // Xóa file cũ nếu có và khác file mới
    if (combo.image && combo.image !== image) {
      try {
        await deleteFile(combo.image)
      } catch (_err) {
        console.error('Không xóa được file cũ:', _err)
      }
    }

    const updated = await Combo.findOneAndUpdate(
      matchCondition,
      { sku, name, image, items, price, note },
      { new: true }
    ).populate('items.menuItem', '_id name')

    responseHelper.success(res, updated, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const deleteCombos = async (req, res) => {
  try {
    const { ids } = req.body

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!Array.isArray(ids) || ids.length === 0)
      return responseHelper.error(res, 'Không có combo nào được chọn để xóa', 400)

    const warehouse = await getWarehouse(req, organizationId)

    const matchCondition = {
      _id: { $in: ids },
      organization: organizationId,
      warehouse
    }

    // Tìm trước danh sách combo cần xóa để xóa ảnh
    const combosToDelete = await Combo.find(matchCondition).lean()

    if (combosToDelete.length === 0)
      return responseHelper.error(res, 'Không tìm thấy combo hợp lệ để xóa', 404)

    // Xóa combo theo đúng kho và tổ chức
    const result = await Combo.deleteMany(matchCondition)

    // Xóa ảnh liên quan
    for (const combo of combosToDelete) {
      if (combo.image) {
        try {
          await deleteFile(combo.image)
        } catch (err) {
          console.error(`Không xóa được ảnh của ${combo.name}:`, err)
        }
      }
    }

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const searchCombos = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim()
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!keyword) return responseHelper.success(res, [])

    // Lấy kho hiện tại
    const warehouse = await getWarehouse(req, organizationId)

    // Tìm combo theo tổ chức + kho + keyword
    const combos = await Combo.find({
      organization: organizationId,
      warehouse,
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } }
      ]
    })
      .populate('items.menuItem', '_id name')
      .lean()

    // Format kết quả
    const formattedCombos = combos.map((combo) => ({
      _id: combo._id,
      sku: combo.sku || '',
      name: combo.name || 'Combo không rõ tên',
      image: combo.image || '',
      price: Number(combo.price) || 0,
      isCombo: true,
      items: (combo.items || []).map((i) => ({
        menuItem: {
          _id: i.menuItem?._id || '',
          name: i.menuItem?.name || 'Không rõ món'
        }
      }))
    }))

    responseHelper.success(res, formattedCombos)
  } catch (error) {
    console.error('Search Combo Error:', error)
    responseHelper.error(res, 'Tìm combo thất bại')
  }
}
