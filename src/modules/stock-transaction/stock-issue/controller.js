import mongoose from 'mongoose'
import { StockIssue, units } from './model.js'
import IngredientStock from '../../inventory/ingredient-stock/model.js'
import { Ingredient } from '../../inventory/ingredient/model.js'
import Warehouse from '../../inventory/warehouse/model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import withTransaction from '../../../helpers/withTransaction.js'
import { generateDocumentCode } from '../../../helpers/common.js'
import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import StockHistory from '../stock-history/model.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import Organization from '../../organization/model.js'
import BusinessError from '../../error/BusinessError.js'

// DATATABLE SERVER-SIDE
export const getStockIssues = async (req, res) => {
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

    const matchCondition = { organization: organizationId }

    // Warehouse filtering
    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
      // null -> xem tất cả
    }

    const pipeline = [
      { $match: matchCondition },
      ...lookupRef('warehouse', 'Warehouses'),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' }),
      ...lookupUser('createdBy')
    ]

    // Search before grouping
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: 'i' } },
            { reason: { $regex: searchValue, $options: 'i' } },
            { note: { $regex: searchValue, $options: 'i' } },
            { 'warehouse.name': { $regex: searchValue, $options: 'i' } },
            { 'ingredient.name': { $regex: searchValue, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$items.quantity' },
                  regex: searchValue
                }
              }
            },
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $dateToString: { format: '%d/%m/%Y', date: '$date' }
                  },
                  regex: searchValue,
                  options: 'i'
                }
              }
            }
          ]
        }
      })
    }

    // Group và filter items rỗng
    pipeline.push(
      {
        $addFields: {
          'items.ingredient': {
            _id: '$ingredient._id',
            name: '$ingredient.name'
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          code: { $first: '$code' },
          reason: { $first: '$reason' },
          note: { $first: '$note' },
          date: { $first: '$date' },
          warehouse: { $first: '$warehouse' },
          createdAt: { $first: '$createdAt' },
          createdBy: { $first: '$createdBy.username' },
          items: {
            $push: {
              $cond: {
                if: { $ne: ['$items.ingredient', null] },
                then: '$items',
                else: '$$REMOVE'
              }
            }
          },
          isLocked: { $first: '$isLocked' }
        }
      }
    )

    // Đếm sau lọc
    const recordsTotal = await StockIssue.countDocuments({
      organization: organizationId
    })
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await StockIssue.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'warehouse.name':
      case 'warehouse':
        sortObj['warehouse.name'] = sortDir
        break
      case 'code':
        sortObj['code'] = sortDir
        break
      case 'reason':
        sortObj['reason'] = sortDir
        break
      case 'note':
        sortObj['note'] = sortDir
        break
      case 'date':
        sortObj['date'] = sortDir
        break
      case 'createdAt':
        sortObj['createdAt'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    if (sortField !== '_id') {
      sortObj['_id'] = sortDir
    }

    pipeline.push({ $sort: sortObj })
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    pipeline.push({
      $project: {
        ingredient: 0
      }
    })

    const data = await StockIssue.aggregate(pipeline)

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// Get Stock Issue by ID (Detail)
export const getStockIssueById = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {
      _id: id,
      organization: organizationId
    }

    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
    }

    const stockIssue = await StockIssue.findOne(matchCondition).populate([
      { path: 'warehouse', select: 'name location' },
      { path: 'createdBy', select: 'username' },
      { path: 'updatedBy', select: 'username' },
      { path: 'items.ingredient', select: 'name unit' }
    ])

    if (!stockIssue) {
      return responseHelper.error(res, 'Không tìm thấy phiếu xuất', 404)
    }

    responseHelper.success(res, { stockIssue, units }, 'Lấy thông tin phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// CREATE
export const createStockIssue = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const issue = await withTransaction(async (session) => {
      const code = await generateDocumentCode(StockIssue, 'SI')
      const date = new Date()
      const docData = {
        code: code,
        date: date,
        createdBy: req.user._id,
        organization: organizationId
      }

      // Warehouse logic
      if (req.warehouseFilter) {
        // Staff - bắt buộc dùng kho được gán
        docData.warehouse = req.warehouseFilter
      } else {
        // Admin/Org - dùng defaultWarehouse
        const org = await Organization.findById(organizationId).select('defaultWarehouse')
        if (!org?.defaultWarehouse) {
          throw new BusinessError(
            'Tổ chức chưa thiết lập kho mặc định. Vui lòng cập nhật trong profile.',
            400
          )
        }
        docData.warehouse = org.defaultWarehouse
      }

      const doc = new StockIssue(docData)
      await doc.save({ session })
      return doc
    })
    responseHelper.success(
      res,
      { id: issue._id, code: issue.code },
      'Khởi tạo phiếu xuất thành công'
    )
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UPDATE (form)
export const updateStockIssue = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) throw new BusinessError('ID không hợp lệ', 400)

      const matchCondition = {
        _id: id,
        organization: organizationId
      }

      if (req.warehouseFilter) {
        matchCondition.warehouse = req.warehouseFilter
      }
      const oldIssue = await StockIssue.findOne(matchCondition).session(session)

      if (!oldIssue) throw new BusinessError('Phiếu xuất không tồn tại', 404)
      if (oldIssue.isLocked)
        throw new BusinessError('Phiếu xuất đã bị khóa, không thể chỉnh sửa', 400)

      const { reason, note, items: rawItems = [] } = req.body
      const warehouse = oldIssue.warehouse // warehouse không được đổi

      // Validate input
      if (!warehouse) throw new BusinessError('Vui lòng chọn kho xuất', 400)
      if (!Array.isArray(rawItems) || rawItems.length === 0)
        throw new BusinessError('Vui lòng thêm ít nhất một sản phẩm', 400)

      // Chuẩn hóa items - lọc bỏ item có quantity = 0
      const newItems = rawItems
        .map((item) => ({
          ingredient: item.ingredient,
          unit: item.unit || '',
          quantity: Math.abs(parseFloat(item.quantity) || 0)
        }))
        .filter((item) => item.ingredient && item.quantity > 0)

      if (newItems.length === 0) throw new BusinessError('Không có sản phẩm hợp lệ để xuất', 400)

      // Tính toán thay đổi tồn kho
      const stockChanges = new Map() // key: ingredient_warehouse, value: {ingredient, warehouse, change}

      // Hoàn trả items cũ
      if (oldIssue.warehouse && oldIssue.items.length > 0) {
        for (const oldItem of oldIssue.items) {
          if (oldItem.ingredient && oldItem.quantity > 0) {
            const key = `${oldItem.ingredient}_${oldIssue.warehouse}`
            const existing = stockChanges.get(key) || {
              ingredient: oldItem.ingredient,
              warehouse: oldIssue.warehouse,
              change: 0
            }
            existing.change += oldItem.quantity // Hoàn trả (cộng vào)
            stockChanges.set(key, existing)
          }
        }
      }

      // Trừ items mới
      for (const newItem of newItems) {
        if (newItem.ingredient && newItem.quantity > 0) {
          const key = `${newItem.ingredient}_${warehouse}`
          const existing = stockChanges.get(key) || {
            ingredient: newItem.ingredient,
            warehouse: warehouse,
            change: 0
          }
          existing.change -= newItem.quantity // Xuất kho (trừ đi)
          stockChanges.set(key, existing)
        }
      }

      // Kiểm tra tồn kho cho tất cả thay đổi
      for (const stockChange of stockChanges.values()) {
        if (stockChange.change >= 0) continue // Không cần kiểm tra nếu là hoàn trả

        const stock = await IngredientStock.findOne({
          ingredient: stockChange.ingredient,
          warehouse: stockChange.warehouse,
          organization: organizationId
        }).session(session)

        const currentStock = stock?.quantity || 0
        const requiredStock = Math.abs(stockChange.change) // Số lượng cần xuất

        if (currentStock < requiredStock) {
          const ingredientDoc = await Ingredient.findOne(
            { _id: stockChange.ingredient, organization: organizationId },
            'name'
          ).session(session)
          const warehouseDoc = await Warehouse.findOne(
            { _id: stockChange.warehouse, organization: organizationId },
            'name'
          ).session(session)
          throw new BusinessError(
            `Không đủ tồn kho cho "${ingredientDoc?.name || 'nguyên liệu'}" tại kho "${warehouseDoc?.name || 'không xác định'}". ` +
              `Tồn kho hiện tại: ${currentStock}, yêu cầu: ${requiredStock}`,
            400
          )
        }
      }

      // Cập nhật thông tin phiếu xuất
      const updateData = {
        warehouse,
        reason: reason?.trim() || '',
        note: note?.trim() || '',
        items: newItems,
        updatedBy: req.user._id
      }

      const updatedIssue = await StockIssue.findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateData,
        {
          new: true,
          session,
          runValidators: true
        }
      )
      if (!updatedIssue) throw new BusinessError('Cập nhật phiếu xuất thất bại', 400)

      // Áp dụng thay đổi tồn kho
      for (const [, stockChange] of stockChanges) {
        if (stockChange.change === 0) continue // Không thay đổi

        await IngredientStock.updateOne(
          {
            ingredient: stockChange.ingredient,
            warehouse: stockChange.warehouse,
            organization: organizationId
          },
          { $inc: { quantity: stockChange.change } },
          { upsert: true, session }
        )
      }

      // Cập nhật tổng stock trong Ingredient
      const allAffectedIngredients = [
        ...new Set([...Array.from(stockChanges.values()).map((sc) => sc.ingredient.toString())])
      ]
      await updateIngredientTotalStock(allAffectedIngredients, organizationId, session)

      // Populate để trả về client
      await updatedIssue.populate([
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy', select: 'username' },
        { path: 'updatedBy', select: 'username' },
        { path: 'items.ingredient', select: 'name unit' }
      ])

      return updatedIssue
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu xuất thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      // Expected business errors - no logging to reduce terminal noise
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

// DELETE - Hoàn trả kho và xóa phiếu (được sửa)
export const deleteStockIssues = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BusinessError('Không có phiếu nào được chọn', 400)
      }

      // Match condition với warehouse filter
      const matchCondition = {
        _id: { $in: ids },
        organization: organizationId
      }

      if (req.warehouseFilter) {
        matchCondition.warehouse = req.warehouseFilter
      }

      const issues = await StockIssue.find(matchCondition).session(session)
      if (issues.length === 0) throw new BusinessError('Không tìm thấy phiếu xuất', 404)

      const allAffectedIngredients = new Set()

      // Kiểm tra khóa và hoàn trả kho
      for (const issue of issues) {
        if (issue.isLocked) {
          throw new BusinessError(`Phiếu xuất "${issue.code}" đã bị khóa, không thể xóa`, 400)
        }

        // Hoàn trả tồn kho nếu phiếu có warehouse và items
        if (issue.warehouse && issue.items?.length > 0) {
          for (const item of issue.items) {
            if (item.ingredient && item.quantity > 0) {
              // Hoàn trả vào IngredientStock
              await IngredientStock.updateOne(
                {
                  ingredient: item.ingredient,
                  warehouse: issue.warehouse,
                  organization: organizationId
                },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
              )

              allAffectedIngredients.add(item.ingredient.toString())
            }
          }
        }
      }

      // Xóa các phiếu
      await StockIssue.deleteMany(matchCondition, { session })

      // Cập nhật tổng stock cho tất cả ingredients bị ảnh hưởng
      if (allAffectedIngredients.size > 0) {
        await updateIngredientTotalStock([...allAffectedIngredients], organizationId, session)
      }
    })

    responseHelper.success(res, null, 'Xóa phiếu xuất thành công và hoàn trả tồn kho')
  } catch (error) {
    if (error instanceof BusinessError) {
      // Expected business errors - no logging to reduce terminal noise
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

// LOCK - Khóa phiếu xuất để không thể chỉnh sửa
export const lockStockIssue = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const issue = await StockIssue.findOne({
      _id: id,
      organization: organizationId
    })

    if (!issue) {
      return responseHelper.error(res, 'Không tìm thấy phiếu xuất', 404)
    }

    if (issue.isLocked) {
      return responseHelper.error(res, 'Phiếu xuất đã được khóa trước đó', 400)
    }

    if (!issue.warehouse || !issue.items || issue.items.length === 0) {
      return responseHelper.error(res, 'Không thể khóa phiếu xuất chưa hoàn thành', 400)
    }

    // Validate items
    for (const item of issue.items) {
      if (!item.ingredient) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin ingredient', 400)
      }
      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return responseHelper.error(res, 'Có sản phẩm với số lượng không hợp lệ', 400)
      }
    }

    let finalIssue

    await withTransaction(async (session) => {
      finalIssue = await StockIssue.findOneAndUpdate(
        {
          _id: id,
          organization: organizationId
        },
        {
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: req.user._id
        },
        { new: true, session }
      )
        .populate('lockedBy', 'name username')
        .populate('items.ingredient', 'name sku unit stock')
        .populate('warehouse', 'name code')

      if (!finalIssue) {
        throw new Error('Phiếu xuất không tồn tại hoặc đã bị xóa bởi user khác')
      }

      // Tính toán dữ liệu từ finalIssue
      const warehouseId = finalIssue.warehouse?._id || finalIssue.warehouse
      const totalItems = finalIssue.items.length
      const totalQuantity = finalIssue.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      )

      const itemsSummary = finalIssue.items.map((item) => ({
        ingredient: item.ingredient._id || item.ingredient,
        quantity: Number(item.quantity) || 0
      }))

      // Tạo stock history
      const stockHistory = {
        transactionType: 'ISSUE',
        documentType: 'StockIssue',
        documentId: finalIssue._id,
        documentCode: finalIssue.code || finalIssue.documentCode || '',
        warehouse: warehouseId,
        fromWarehouse: warehouseId || null,
        toWarehouse: null,
        totalItems,
        totalQuantity,
        items: itemsSummary,
        reason: 'Stock issue locked',
        note: finalIssue.note ? `${finalIssue.note} (Locked)` : 'Stock issue locked',
        transactionDate: finalIssue.date || new Date(),
        createdBy: req.user._id,
        updatedBy: null,
        organization: organizationId
      }

      await StockHistory.create([stockHistory], { session })
    })

    responseHelper.success(res, finalIssue, 'Đã khóa phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message || 'Có lỗi xảy ra khi khóa phiếu xuất')
  }
}

async function updateIngredientTotalStock(ingredientIds, organizationId, session) {
  if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) return

  for (const ingId of ingredientIds) {
    const objectId = mongoose.Types.ObjectId.isValid(ingId)
      ? new mongoose.Types.ObjectId(String(ingId))
      : ingId

    const totalStockAgg = await IngredientStock.aggregate([
      { $match: { ingredient: objectId, organization: organizationId } },
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
    ]).session(session)

    const totalStock = totalStockAgg[0]?.totalQuantity || 0

    await Ingredient.updateOne(
      { _id: objectId, organization: organizationId },
      { $set: { stock: totalStock } },
      { session }
    )
  }
}
