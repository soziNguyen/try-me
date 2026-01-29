import { Combo } from './model.js'
import { deleteFile } from '../../upload/helper.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupUser, lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import Organization from '../../organization/model.js'
import { getWarehouse } from '../../../helpers/warehouseHelper.js'
import Table from '../../table/model.js'
import { logActivity } from '../../activity-logs/service.js'

export const getActiveCombos = async (req, res) => {
  try {
    let organizationId = getCurrentOrg(req)
    let warehouseFilter = req.warehouseFilter || null

    // Nếu chưa đăng nhập (khách quét QR) -> lấy org & warehouse từ tableId
    if (!req.isAuthenticated?.() && req.query.tableId) {
      const tableId = req.query.tableId.replace(/\?$/, '') // loại bỏ ? nếu có
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
      ...lookupRef('tax', 'Taxes', { as: 'tax' }),
      ...lookupUser('createdBy')
    ]

    // search
    if (searchValue) {
      const searchNumber = Number(searchValue)
      const orConditions = [
        { sku: { $regex: searchValue, $options: 'i' } },
        { name: { $regex: searchValue, $options: 'i' } },
        { note: { $regex: searchValue, $options: 'i' } },
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
          isActive: { $first: '$isActive' },
          tax: { $first: '$tax' },
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
    const { sku, name, image, items, price, note, isActive } = req.body

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
      isActive,
      organization: organizationId,
      createdBy: req.user._id,
      warehouse
    })

    await combo.save()
    await combo.populate('items.menuItem', '_id name')

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'CREATE',
      'RECIPE',
      `Thêm mới combo`,
      '',
      'SUCCESS',
      warehouse?._id || null
    )

    responseHelper.success(res, combo, 'Tạo combo thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateCombo = async (req, res) => {
  try {
    const { id } = req.params
    const { sku, name, image, items, price, note, isActive, tax } = req.body

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

    // Lấy combo cũ
    const oldCombo = await Combo.findOne(matchCondition).populate('items.menuItem', '_id name')
    if (!oldCombo) return responseHelper.error(res, 'Không tìm thấy combo', 404)

    if (oldCombo.image && oldCombo.image !== image) {
      try {
        await deleteFile(oldCombo.image)
      } catch (_err) {
        console.error('Không xóa được file cũ:', _err)
      }
    }

    const updated = await Combo.findOneAndUpdate(
      matchCondition,
      { sku, name, image, items, price, note, isActive, tax },
      { new: true }
    )
      .populate('items.menuItem', '_id name')
      .populate('tax', 'name rate')

    if (!updated) return responseHelper.error(res, 'Cập nhật thất bại', 400)

    const changes = []
    // Phần ghi lại thay đổi mới -> cũ
    if ((oldCombo.sku || '') !== (updated.sku || '')) {
      changes.push(`SKU: "${oldCombo.sku || ''}" → "${updated.sku || ''}"`)
    }

    if ((oldCombo.name || '') !== (updated.name || '')) {
      changes.push(`Tên: "${oldCombo.name || ''}" → "${updated.name || ''}"`)
    }

    if (oldCombo.price !== updated.price) {
      changes.push(
        `Giá: ${oldCombo.price?.toLocaleString() || 0}đ → ${updated.price?.toLocaleString() || 0}đ`
      )
    }

    if ((oldCombo.note || '') !== (updated.note || '')) {
      changes.push(`Ghi chú: "${oldCombo.note || ''}" → "${updated.note || ''}"`)
    }

    if (oldCombo.isActive !== updated.isActive) {
      const oldStatus = oldCombo.isActive ? 'Kích hoạt' : 'Vô hiệu'
      const newStatus = updated.isActive ? 'Kích hoạt' : 'Vô hiệu'
      changes.push(`Trạng thái: ${oldStatus} → ${newStatus}`)
    }

    if ((oldCombo.image || '') !== (updated.image || '')) {
      changes.push(`Ảnh: Đã thay đổi`)
    }

    const deltaMap = new Map()

    for (const oldItem of oldCombo.items) {
      if (oldItem.menuItem) {
        const menuItemId = oldItem.menuItem._id.toString()
        deltaMap.set(menuItemId, {
          name: oldItem.menuItem.name,
          old: oldItem.quantity,
          new: 0,
          delta: -oldItem.quantity
        })
      }
    }

    for (const newItem of updated.items) {
      if (newItem.menuItem) {
        const menuItemId = newItem.menuItem._id.toString()
        const existing = deltaMap.get(menuItemId)

        if (existing) {
          existing.new = newItem.quantity
          existing.delta = newItem.quantity - existing.old
        } else {
          deltaMap.set(menuItemId, {
            name: newItem.menuItem.name,
            old: 0,
            new: newItem.quantity,
            delta: newItem.quantity
          })
        }
      }
    }

    const itemChanges = []
    for (const [menuItemId, data] of deltaMap) {
      if (data.delta !== 0) {
        if (data.old === 0) {
          itemChanges.push(`Thêm "${data.name}" (SL: ${data.new})`)
        } else if (data.new === 0) {
          itemChanges.push(`Xóa "${data.name}" (SL: ${data.old})`)
        } else {
          itemChanges.push(`"${data.name}": SL ${data.old} → ${data.new}`)
        }
      }
    }

    if (itemChanges.length > 0) {
      changes.push(`Món ăn: ${itemChanges.join('; ')}`)
    }

    // Ghi log nếu có thay đổi
    if (changes.length > 0) {
      const description = `Cập nhật combo: ${updated.sku || updated._id} - ${changes.join(' | ')}`

      logActivity(
        organizationId,
        req.user._id,
        req.user.username,
        'UPDATE',
        'COMBO',
        description,
        updated.sku || updated._id.toString(),
        'SUCCESS',
        warehouse || null
      )
    }

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

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'DELETE',
      'RECIPE',
      `Đã xóa ${result.deletedCount} combo`,
      '',
      'SUCCESS',
      warehouse?._id || null
    )

    responseHelper.success(res, result.deletedCount, 'Xóa thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const searchCombos = async (req, res) => {
  try {
    const keyword = (req.query.s || '').trim()
    let organizationId = getCurrentOrg(req)
    let warehouseFilter = req.warehouseFilter || null

    // Khách chưa đăng nhập nhưng có tableId
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

    // Query combos theo organization + warehouse + keyword
    const combos = await Combo.find({
      organization: organizationId,
      warehouse: warehouseFilter,
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } },
        { note: { $regex: keyword, $options: 'i' } }
      ]
    })
      .populate('items.menuItem', '_id name')
      .lean()

    const formattedCombos = combos.map((combo) => ({
      _id: combo._id,
      sku: combo.sku || '',
      name: combo.name || 'Combo không rõ tên',
      note: combo.note || '',
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
