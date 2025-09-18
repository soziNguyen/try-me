import { Combo } from './model.js'
import { deleteFile } from '../../upload/helper.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupUser, lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'

export const getActiveCombos = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const combo = await Combo.find({
      isActive: true,
      organization: organizationId
    }).populate('items.menuItem', '_id name')
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

    // base pipeline
    let pipeline = [
      { $match: { organization: organizationId } },
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
    const recordsTotal = await Combo.countDocuments({
      organization: organizationId
    })

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
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { sku, name, image, items, price, note } = req.body
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
      createdBy: req.user._id
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

    const existing = await Combo.findOne({
      _id: { $ne: id },
      organization: organizationId,
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
      if (it.quantity <= 0) {
        return responseHelper.error(res, 'Số lượng phải lớn hơn 0', 400)
      }
    }

    // Lấy combo cũ để so sánh ảnh
    const combo = await Combo.findOne({
      _id: id,
      organization: organizationId
    })
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
      { _id: id, organization: organizationId },
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

    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, 'Không có combo nào được chọn để xóa', 400)
    }

    const result = await Combo.deleteMany({
      _id: { $in: ids },
      organization: organizationId
    })

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (err) {
    return responseHelper.error(res, err.message)
  }
}

export const searchCombos = async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim()
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!keyword) {
      return responseHelper.success(res, [])
    }

    const combos = await Combo.find({
      organization: organizationId,
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } }
      ]
    }).populate('items.menuItem', '_id name')

    // ✅ Format lại dữ liệu combo cho đúng định dạng frontend cần
    const formattedCombos = combos.map((combo) => ({
      _id: combo._id,
      sku: combo.sku || '',
      name: combo.name || 'Combo không rõ tên',
      image: combo.image || '',
      price: typeof combo.price === 'number' ? combo.price : 0,
      isCombo: true,
      items: Array.isArray(combo.items)
        ? combo.items.map((i) => ({
            menuItem: {
              _id: i.menuItem?._id || '',
              name: i.menuItem?.name || 'Không rõ món'
            }
          }))
        : []
    }))

    responseHelper.success(res, formattedCombos)
  } catch (error) {
    console.error('Search Combo Error:', error)
    responseHelper.error(res, 'Tìm combo thất bại')
  }
}
