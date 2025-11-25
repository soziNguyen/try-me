import mongoose from 'mongoose'
import StockTransfer from './model.js'
import Warehouse from '../../inventory/warehouse/model.js'
import IngredientStock from '../../inventory/ingredient-stock/model.js'
import { Ingredient } from '../../inventory/ingredient/model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import withTransaction from '../../../helpers/withTransaction.js'
import { generateDocumentCode } from '../../../helpers/common.js'
import { lookupRef } from '../../../helpers/lookupHelper.js'
import StockHistory from '../stock-history/model.js'
import Organization from '../../organization/model.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import BusinessError from '../../error/BusinessError.js'
import { getWarehouse } from '../../../helpers/warehouseHelper.js'
import { logActivity } from '../../activity-logs/service.js'

// DATATABLE SERVER-SIDE
export const getStockTransfers = async (req, res) => {
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
      matchCondition.fromWarehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.fromWarehouse = org.defaultWarehouse
      }
      // null -> xem tất cả
    }

    // Base pipeline (lookup trước khi group)
    const pipeline = [
      { $match: matchCondition },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' }),
      ...lookupRef('fromWarehouse', 'Warehouses', { as: 'fromWarehouse' }),
      ...lookupRef('items.toWarehouse', 'Warehouses', { as: 'toWarehouse' }),
      ...lookupRef('createdBy', 'Users', { as: 'createdBy' })
    ]

    // Search nếu có
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: 'i' } },
            { note: { $regex: searchValue, $options: 'i' } },
            { 'createdBy.name': { $regex: searchValue, $options: 'i' } },
            { 'fromWarehouse.name': { $regex: searchValue, $options: 'i' } },
            { 'toWarehouse.name': { $regex: searchValue, $options: 'i' } },
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

    // Group lại để tránh nhân bản phiếu
    pipeline.push(
      {
        $addFields: {
          'items.ingredient': {
            _id: '$ingredient._id',
            name: '$ingredient.name'
          },
          'items.fromWarehouse': {
            _id: '$fromWarehouse._id',
            name: '$fromWarehouse.name',
            location: '$fromWarehouse.location'
          },
          'items.toWarehouse': {
            _id: '$toWarehouse._id',
            name: '$toWarehouse.name',
            location: '$toWarehouse.location'
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          code: { $first: '$code' },
          note: { $first: '$note' },
          date: { $first: '$date' },
          createdAt: { $first: '$createdAt' },
          createdBy: { $first: '$createdBy.username' },
          items: { $push: '$items' },
          isLocked: { $first: '$isLocked' },
          lockedAt: { $first: '$lockedAt' },
          lockedBy: { $first: '$lockedBy' }
        }
      }
    )

    // Sort object
    const sortObj = { [sortField]: sortDir }

    // Dùng $facet để vừa count vừa phân trang
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $sort: sortObj }, { $skip: start }, { $limit: length }]
      }
    })

    // Chạy query
    const result = await StockTransfer.aggregate(pipeline)

    const recordsFiltered = result[0]?.metadata[0]?.total || 0
    const data = result[0]?.data || []

    // Tổng số phiếu không filter
    const recordsTotal = await StockTransfer.countDocuments(matchCondition)

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

// Get Stock Transfer by ID (Detail)
export const getStockTransferById = async (req, res) => {
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
      matchCondition.fromWarehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.fromWarehouse = org.defaultWarehouse
      }
    }

    const stockTransfer = await StockTransfer.findOne(matchCondition)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('lockedBy', 'name username')
      .populate('items.ingredient', 'name unit')
      .populate('fromWarehouse', 'name location')
      .populate('items.toWarehouse', 'name location')
      .lean()

    if (!stockTransfer) {
      return responseHelper.error(res, 'Không tìm thấy phiếu chuyển kho', 404)
    }

    responseHelper.success(res, stockTransfer, 'Lấy thông tin phiếu chuyển kho thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// CREATE
export const createStockTransfer = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Lấy warehouse trước khi vào transaction
    const fromWarehouse = await getWarehouse(req, organizationId)

    const transfer = await withTransaction(async (session) => {
      const code = await generateDocumentCode(StockTransfer, 'ST')
      const date = new Date()
      const docData = {
        code: code,
        date: date,
        createdBy: req.user._id,
        organization: organizationId,
        fromWarehouse
      }

      const doc = new StockTransfer(docData)
      await doc.save({ session })
      return doc
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'CREATE',
      'STOCK_TRANSFER',
      'Tạo phiếu chuyển kho nguyên liệu',
      transfer.code,
      'SUCCESS',
      fromWarehouse?._id
    )

    responseHelper.success(
      res,
      { id: transfer._id, code: transfer.code },
      'Khởi tạo phiếu chuyển kho thành công'
    )
  } catch (err) {
    if (err instanceof BusinessError) {
      return responseHelper.error(res, err.message, err.statusCode)
    }
    responseHelper.error(res, err.message)
  }
}

// UPDATE (form)
export const updateStockTransferFromForm = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const transactionResult = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new BusinessError('ID không hợp lệ', 400)
      }

      const matchCondition = {
        _id: id,
        organization: organizationId
      }

      // Sửa: warehouse filter nên check fromWarehouse
      if (req.warehouseFilter) {
        matchCondition.fromWarehouse = req.warehouseFilter
      }

      // Lấy phiếu chuyển kho cũ VÀ POPULATE để log
      const oldTransfer = await StockTransfer.findOne(matchCondition)
        .populate('items.ingredient', 'name')
        .populate('items.toWarehouse', 'name')
        .session(session)

      if (!oldTransfer) throw new BusinessError('Phiếu chuyển kho không tồn tại', 404)
      if (oldTransfer.isLocked) {
        throw new BusinessError('Phiếu chuyển kho đã bị khóa, không thể chỉnh sửa', 400)
      }

      // Lấy dữ liệu mới từ form
      const { note, items: rawItems = [] } = req.body
      const fromWarehouse = oldTransfer.fromWarehouse // fromWarehouse không được đổi

      // Pre-validate và batch query để tối ưu performance
      const validRawItems = rawItems.filter(
        (item) => item.ingredient && item.toWarehouse && item.quantity
      )

      if (validRawItems.length === 0) {
        throw new BusinessError('Phải có ít nhất một mặt hàng để chuyển kho', 400)
      }

      // Lấy ingredient IDs từ cả items mới và items cũ
      const ingredientIds = [
        ...new Set([
          ...validRawItems.map((item) => item.ingredient),
          ...oldTransfer.items.map((item) => {
            if (typeof item.ingredient === 'object' && item.ingredient._id) {
              return item.ingredient._id.toString()
            }
            return item.ingredient.toString()
          })
        ])
      ].filter(Boolean)

      // Warehouse IDs bao gồm fromWarehouse và tất cả toWarehouse
      const warehouseIds = [
        ...new Set([
          fromWarehouse.toString(),
          ...validRawItems.map((item) => item.toWarehouse),
          ...oldTransfer.items.map((item) => {
            if (typeof item.toWarehouse === 'object' && item.toWarehouse._id) {
              return item.toWarehouse._id.toString()
            }
            return item.toWarehouse.toString()
          })
        ])
      ].filter(Boolean)

      // Batch query để giảm database calls
      const [allIngredients, allWarehouses] = await Promise.all([
        Ingredient.find({ _id: { $in: ingredientIds }, organization: organizationId })
          .select('_id name')
          .session(session),
        Warehouse.find({ _id: { $in: warehouseIds }, organization: organizationId })
          .select('_id name')
          .session(session)
      ])

      const ingredientMap = new Map(allIngredients.map((ing) => [ing._id.toString(), ing]))
      const warehouseMap = new Map(allWarehouses.map((wh) => [wh._id.toString(), wh]))

      // ===== TẠO MAP ĐỂ LƯU THÔNG TIN CHO LOG =====
      const itemChangesMap = new Map()

      // Ghi nhận items cũ
      for (const oldItem of oldTransfer.items) {
        if (oldItem.ingredient && oldItem.toWarehouse && oldItem.quantity > 0) {
          let ingId, ingredientName
          if (typeof oldItem.ingredient === 'object' && oldItem.ingredient._id) {
            ingId = oldItem.ingredient._id.toString()
            ingredientName = oldItem.ingredient.name || 'N/A'
          } else {
            ingId = oldItem.ingredient.toString()
            const ing = ingredientMap.get(ingId)
            ingredientName = ing?.name || 'N/A'
          }

          let whId, warehouseName
          if (typeof oldItem.toWarehouse === 'object' && oldItem.toWarehouse._id) {
            whId = oldItem.toWarehouse._id.toString()
            warehouseName = oldItem.toWarehouse.name || 'N/A'
          } else {
            whId = oldItem.toWarehouse.toString()
            const wh = warehouseMap.get(whId)
            warehouseName = wh?.name || 'N/A'
          }

          const key = `${ingId}_${whId}`
          itemChangesMap.set(key, {
            ingredientName,
            warehouseName,
            oldQty: oldItem.quantity,
            newQty: 0
          })
        }
      }

      // Chuẩn hóa dữ liệu items mới với validation
      const newItems = validRawItems.map((item) => {
        const quantity = parseFloat(item.quantity) || 0
        if (quantity <= 0) {
          throw new BusinessError('Số lượng chuyển phải lớn hơn 0', 400)
        }

        // Validate: Kho nguồn và kho đích không được giống nhau
        if (fromWarehouse.toString() === item.toWarehouse.toString()) {
          throw new BusinessError('Kho nguồn và kho đích không được giống nhau', 400)
        }

        // Validate existence using pre-loaded data
        const ingredient = ingredientMap.get(item.ingredient)
        const toWarehouse = warehouseMap.get(item.toWarehouse)

        if (!ingredient) {
          throw new BusinessError(`Nguyên liệu không tồn tại: ${item.ingredient}`, 404)
        }
        if (!toWarehouse) {
          throw new BusinessError(`Kho đích không tồn tại: ${item.toWarehouse}`, 404)
        }

        // Cập nhật thông tin cho log
        const key = `${item.ingredient}_${item.toWarehouse}`
        const existing = itemChangesMap.get(key)

        if (existing) {
          existing.newQty = quantity
        } else {
          itemChangesMap.set(key, {
            ingredientName: ingredient.name,
            warehouseName: toWarehouse.name,
            oldQty: 0,
            newQty: quantity
          })
        }

        return {
          ingredient: item.ingredient,
          toWarehouse: item.toWarehouse,
          quantity
        }
      })

      // TÍNH TOÁN ẢNH HƯỞNG NET (không hoàn tác ngay)
      const stockChanges = new Map() // key: ingredient_warehouse, value: net change

      // Tính toán thay đổi từ việc xóa items cũ (hoàn tác)
      for (const oldItem of oldTransfer.items) {
        if (oldItem.ingredient && oldItem.quantity && oldItem.toWarehouse) {
          // Validate data integrity - phát hiện data corrupt
          if (oldItem.quantity <= 0) {
            throw new BusinessError(
              `Dữ liệu không hợp lệ: Item cũ có quantity <= 0 (ID: ${oldItem._id})`,
              500
            )
          }

          // Xử lý ingredient ID an toàn
          const ingId =
            typeof oldItem.ingredient === 'object' && oldItem.ingredient._id
              ? oldItem.ingredient._id.toString()
              : oldItem.ingredient.toString()

          // Xử lý toWarehouse ID an toàn
          const toWhId =
            typeof oldItem.toWarehouse === 'object' && oldItem.toWarehouse._id
              ? oldItem.toWarehouse._id.toString()
              : oldItem.toWarehouse.toString()

          const fromKey = `${ingId}_${fromWarehouse}`
          const toKey = `${ingId}_${toWhId}`

          // Hoàn tác: Cộng lại vào kho nguồn
          stockChanges.set(fromKey, (stockChanges.get(fromKey) || 0) + oldItem.quantity)
          // Hoàn tác: Trừ khỏi kho đích
          stockChanges.set(toKey, (stockChanges.get(toKey) || 0) - oldItem.quantity)
        }
      }

      // Tính toán thay đổi từ việc thêm items mới
      for (const newItem of newItems) {
        const fromKey = `${newItem.ingredient}_${fromWarehouse}`
        const toKey = `${newItem.ingredient}_${newItem.toWarehouse}`

        // Trừ từ kho nguồn
        stockChanges.set(fromKey, (stockChanges.get(fromKey) || 0) - newItem.quantity)
        // Cộng vào kho đích
        stockChanges.set(toKey, (stockChanges.get(toKey) || 0) + newItem.quantity)
      }

      // KIỂM TRA tồn kho có đủ cho tất cả thay đổi
      const stockValidationQueries = []
      const negativeChanges = []

      for (const [key, netChange] of stockChanges) {
        if (netChange >= 0) continue // Không cần kiểm tra nếu tăng hoặc không đổi

        const [ingredientId, warehouseId] = key.split('_')
        negativeChanges.push({ key, netChange, ingredientId, warehouseId })

        stockValidationQueries.push(
          IngredientStock.findOne({
            ingredient: ingredientId,
            warehouse: warehouseId,
            organization: organizationId
          }).session(session)
        )
      }

      // Batch query stock validation
      if (stockValidationQueries.length > 0) {
        const stockResults = await Promise.all(stockValidationQueries)

        for (let i = 0; i < negativeChanges.length; i++) {
          const { netChange, ingredientId, warehouseId } = negativeChanges[i]
          const currentStock = stockResults[i]
          const currentQuantity = currentStock?.quantity || 0
          const finalQuantity = currentQuantity + netChange

          if (finalQuantity < 0) {
            const ingredient = ingredientMap.get(ingredientId)
            const warehouse = warehouseMap.get(warehouseId)

            throw new BusinessError(
              `Không đủ tồn kho cho "${ingredient?.name || 'Unknown'}" ` +
                `tại kho "${warehouse?.name || 'Unknown'}". ` +
                `Tồn kho hiện tại: ${currentQuantity}, ` +
                `Cần chuyển: ${Math.abs(netChange)}, ` +
                `Thiếu: ${Math.abs(finalQuantity)}`,
              400
            )
          }
        }
      }

      // CẬP NHẬT phiếu chuyển kho trong database
      const updateData = {
        note,
        items: newItems,
        updatedBy: req.user._id,
        updatedAt: new Date()
      }

      const updatedTransfer = await StockTransfer.findOneAndUpdate(
        {
          _id: id,
          organization: organizationId
        },
        updateData,
        {
          new: true,
          session
        }
      )

      if (!updatedTransfer) throw new BusinessError('Cập nhật thất bại', 400)

      // ÁP DỤNG tất cả thay đổi tồn kho với bulk operations
      const bulkStockOps = []

      for (const [key, netChange] of stockChanges) {
        if (netChange === 0) continue // Bỏ qua nếu không có thay đổi

        const [ingredientId, warehouseId] = key.split('_')

        if (netChange > 0) {
          // Tăng tồn kho
          bulkStockOps.push({
            updateOne: {
              filter: {
                ingredient: ingredientId,
                warehouse: warehouseId,
                organization: organizationId
              },
              update: {
                $inc: { quantity: netChange },
                $setOnInsert: {
                  ingredient: ingredientId,
                  warehouse: warehouseId,
                  organization: organizationId,
                  createdAt: new Date()
                }
              },
              upsert: true
            }
          })
        } else {
          // Giảm tồn kho
          bulkStockOps.push({
            updateOne: {
              filter: {
                ingredient: ingredientId,
                warehouse: warehouseId,
                organization: organizationId
              },
              update: { $inc: { quantity: netChange } }
            }
          })
        }
      }

      // Execute bulk operations
      if (bulkStockOps.length > 0) {
        await IngredientStock.bulkWrite(bulkStockOps, { session })
      }

      // CẬP NHẬT tổng tồn kho trong Ingredient với batch query
      const affectedIngredientIds = [
        ...new Set([
          ...oldTransfer.items.map((i) => {
            if (typeof i.ingredient === 'object' && i.ingredient._id) {
              return i.ingredient._id.toString()
            }
            return i.ingredient.toString()
          }),
          ...updatedTransfer.items.map((i) => i.ingredient.toString())
        ])
      ]

      if (affectedIngredientIds.length > 0) {
        const stockAggResults = await IngredientStock.aggregate([
          {
            $match: {
              ingredient: {
                $in: affectedIngredientIds.map((id) => new mongoose.Types.ObjectId(id))
              },
              organization: organizationId
            }
          },
          {
            $group: {
              _id: '$ingredient',
              totalQuantity: { $sum: '$quantity' }
            }
          }
        ]).session(session)

        const stockMap = new Map(
          stockAggResults.map((result) => [result._id.toString(), result.totalQuantity])
        )

        // Update ingredients với stock = 0 cho những ingredient không có trong aggregate
        const bulkIngredientOps = affectedIngredientIds.map((ingredientId) => ({
          updateOne: {
            filter: { _id: ingredientId, organization: organizationId },
            update: {
              $set: {
                stock: Math.max(0, stockMap.get(ingredientId) || 0),
                updatedAt: new Date()
              }
            }
          }
        }))

        await Ingredient.bulkWrite(bulkIngredientOps, { session })
      }

      // Dọn dẹp các record có quantity <= 0
      await IngredientStock.deleteMany(
        { organization: organizationId, quantity: { $lte: 0 } },
        { session }
      )

      // Populate với error handling
      try {
        await updatedTransfer.populate([
          { path: 'createdBy', select: 'username' },
          { path: 'updatedBy', select: 'username' },
          { path: 'lockedBy', select: 'username' },
          { path: 'fromWarehouse', select: 'name location' },
          { path: 'items.ingredient', select: 'name unit' },
          { path: 'items.toWarehouse', select: 'name location' }
        ])
      } catch (populateError) {
        // Log populate error nhưng không fail transaction
        console.warn('Populate error (non-critical):', populateError.message)
      }

      return { updatedTransfer, oldTransfer, itemChangesMap }
    })

    const { updatedTransfer: updatedDoc, oldTransfer, itemChangesMap } = transactionResult

    // ===== XÂY DỰNG LOG CHI TIẾT =====
    const changes = []

    // 1. Thay đổi ghi chú
    if ((oldTransfer.note || '') !== (updatedDoc.note || '')) {
      changes.push(
        `Ghi chú: "${oldTransfer.note || '(Trống)'}" → "${updatedDoc.note || '(Trống)'}"`
      )
    }

    // 2. Phân tích thay đổi nguyên liệu thông minh hơn
    const added = []
    const removed = []
    const modified = []

    for (const [key, data] of itemChangesMap) {
      const delta = data.newQty - data.oldQty
      if (delta !== 0) {
        if (data.oldQty === 0) {
          added.push(`"${data.ingredientName}" → "${data.warehouseName}" (${data.newQty})`)
        } else if (data.newQty === 0) {
          removed.push(`"${data.ingredientName}" → "${data.warehouseName}" (${data.oldQty})`)
        } else {
          modified.push(
            `"${data.ingredientName}" → "${data.warehouseName}": ${data.oldQty} → ${data.newQty}`
          )
        }
      }
    }

    // Tổng hợp log theo nhóm
    const itemChangeParts = []
    if (modified.length > 0) {
      itemChangeParts.push(`Sửa Số lượng: ${modified.join('; ')}`)
    }
    if (added.length > 0) {
      itemChangeParts.push(`Thêm: ${added.join('; ')}`)
    }
    if (removed.length > 0) {
      itemChangeParts.push(`Xóa: ${removed.join('; ')}`)
    }

    if (itemChangeParts.length > 0) {
      changes.push(itemChangeParts.join(' | '))
    }

    // Chỉ log khi có thay đổi
    if (changes.length > 0) {
      const description = `Cập nhật phiếu chuyển kho:${updatedDoc.code} - ${changes.join(' | ')}`

      logActivity(
        organizationId,
        req.user._id,
        req.user.username,
        'UPDATE',
        'STOCK_TRANSFER',
        description,
        updatedDoc.code,
        'SUCCESS',
        updatedDoc.fromWarehouse._id || null
      )
    }

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu chuyển kho thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      // Expected business errors - no logging to reduce terminal noise
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      // Log unexpected errors for debugging
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

// DELETE
export const deleteStockTransfers = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BusinessError('Không có phiếu nào được chọn', 400)
      }

      // Validate ObjectIds
      const validIds = ids.filter((id) => mongoose.isValidObjectId(id))
      if (validIds.length !== ids.length) {
        throw new BusinessError('Một số ID không hợp lệ', 400)
      }

      // Lấy các phiếu chuyển kho với populate để có thông tin chi tiết
      const transfers = await StockTransfer.find({
        _id: { $in: validIds },
        organization: organizationId
      })
        .populate('fromWarehouse', 'name') // fromWarehouse ở ngoài
        .populate('items.ingredient', 'name')
        .populate('items.toWarehouse', 'name') // toWarehouse trong items
        .session(session)

      if (transfers.length === 0) {
        throw new BusinessError('Không tìm thấy phiếu chuyển kho nào', 404)
      }

      if (transfers.length !== validIds.length) {
        throw new BusinessError('Một số phiếu chuyển kho không tồn tại', 404)
      }

      // Kiểm tra phiếu đã khóa
      const lockedTransfers = transfers.filter((t) => t.isLocked)
      if (lockedTransfers.length > 0) {
        const lockedCodes = lockedTransfers.map((t) => t.code).join(', ')
        throw new BusinessError(
          `Các phiếu chuyển kho sau đã bị khóa, không thể xóa: ${lockedCodes}`,
          400
        )
      }

      // TÍNH TOÁN THAY ĐỔI TỒN KHO (hoàn tác tất cả transfers)
      const stockChanges = new Map() // key: ingredient_warehouse, value: quantity change
      const affectedIngredients = new Set()

      for (const transfer of transfers) {
        const fromWarehouseId = transfer.fromWarehouse._id
          ? transfer.fromWarehouse._id.toString()
          : transfer.fromWarehouse.toString()

        for (const item of transfer.items) {
          if (!item.ingredient || !item.quantity || !item.toWarehouse) {
            continue
          }

          // Extract đúng ObjectId từ populated data
          const ingredientId = item.ingredient._id
            ? item.ingredient._id.toString()
            : item.ingredient.toString()
          const toWarehouseId = item.toWarehouse._id
            ? item.toWarehouse._id.toString()
            : item.toWarehouse.toString()
          const quantity = Number(item.quantity)

          affectedIngredients.add(ingredientId)

          const fromKey = `${ingredientId}_${fromWarehouseId}`
          const toKey = `${ingredientId}_${toWarehouseId}`

          // HOÀN TÁC: Cộng lại vào kho nguồn (vì trước đó đã trừ đi)
          stockChanges.set(fromKey, (stockChanges.get(fromKey) || 0) + quantity)

          // HOÀN TÁC: Trừ khỏi kho đích (vì trước đó đã cộng vào)
          stockChanges.set(toKey, (stockChanges.get(toKey) || 0) - quantity)
        }
      }

      // KIỂM TRA TỒN KHO SAU KHI HOÀN TÁC
      const validationErrors = []

      for (const [key, change] of stockChanges) {
        if (change >= 0) continue // Không cần kiểm tra nếu tăng hoặc không đổi

        const [ingredientId, warehouseId] = key.split('_')

        const currentStock = await IngredientStock.findOne({
          ingredient: ingredientId,
          warehouse: warehouseId,
          organization: organizationId
        }).session(session)

        const currentQuantity = currentStock?.quantity || 0
        const finalQuantity = currentQuantity + change

        if (finalQuantity < 0) {
          // Tìm thông tin chi tiết để báo lỗi từ populated data
          const ingredientInfo = transfers
            .flatMap((t) => t.items)
            .find((item) => {
              const itemIngredientId = item.ingredient._id
                ? item.ingredient._id.toString()
                : item.ingredient.toString()
              return itemIngredientId === ingredientId
            })

          // Tìm warehouse name
          let warehouseName = 'Unknown'

          // Kiểm tra nếu là fromWarehouse
          const fromWarehouseMatch = transfers.find((t) => {
            const fwId = t.fromWarehouse._id
              ? t.fromWarehouse._id.toString()
              : t.fromWarehouse.toString()
            return fwId === warehouseId
          })

          if (fromWarehouseMatch) {
            warehouseName = fromWarehouseMatch.fromWarehouse.name || 'Unknown'
          } else {
            // Nếu không phải fromWarehouse thì là toWarehouse
            const toWarehouseMatch = transfers
              .flatMap((t) => t.items)
              .find((item) => {
                const toId = item.toWarehouse._id
                  ? item.toWarehouse._id.toString()
                  : item.toWarehouse.toString()
                return toId === warehouseId
              })

            if (toWarehouseMatch) {
              warehouseName = toWarehouseMatch.toWarehouse.name || 'Unknown'
            }
          }

          const ingredientName = ingredientInfo?.ingredient?.name || 'Unknown'

          validationErrors.push(
            `Không thể hoàn tác: Nguyên liệu "${ingredientName}" ` +
              `tại kho "${warehouseName}" sẽ thiếu ${Math.abs(finalQuantity)} đơn vị ` +
              `(hiện có: ${currentQuantity})`
          )
        }
      }

      if (validationErrors.length > 0) {
        throw new BusinessError(
          `Không thể xóa do các xung đột tồn kho:\n${validationErrors.join('\n')}`,
          400
        )
      }

      // ÁP DỤNG THAY ĐỔI TỒN KHO
      const stockUpdatePromises = []

      for (const [key, change] of stockChanges) {
        if (change === 0) continue

        const [ingredientId, warehouseId] = key.split('_')

        stockUpdatePromises.push(
          IngredientStock.updateOne(
            {
              ingredient: ingredientId,
              warehouse: warehouseId,
              organization: organizationId
            },
            { $inc: { quantity: change } },
            { session }
          )
        )
      }

      await Promise.all(stockUpdatePromises)

      // CẬP NHẬT TỔNG TỒN KHO TRONG INGREDIENT
      const ingredientUpdatePromises = Array.from(affectedIngredients).map(async (ingredientId) => {
        const totalStockAgg = await IngredientStock.aggregate([
          {
            $match: {
              ingredient: new mongoose.Types.ObjectId(String(ingredientId)),
              organization: organizationId
            }
          },
          { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
        ]).session(session)

        const totalStock = Math.max(0, totalStockAgg[0]?.totalQuantity || 0)

        return Ingredient.updateOne(
          { _id: ingredientId, organization: organizationId },
          {
            $set: {
              stock: totalStock,
              updatedAt: new Date()
            }
          },
          { session }
        )
      })

      await Promise.all(ingredientUpdatePromises)

      // DỌN DẸP CÁC RECORD CÓ QUANTITY <= 0
      await IngredientStock.deleteMany(
        { organization: organizationId, quantity: { $lte: 0 } },
        { session }
      )

      // XÓA CÁC PHIẾU CHUYỂN KHO
      const deleteResult = await StockTransfer.deleteMany(
        { _id: { $in: validIds }, organization: organizationId },
        { session }
      )

      if (deleteResult.deletedCount !== transfers.length) {
        throw new BusinessError('Một số phiếu chuyển kho không thể xóa', 400)
      }

      const deletedCodes = transfers.map((e) => e.code).join(', ')
      const fromWarehouseId = transfers[0]?.fromWarehouse?._id

      logActivity(
        organizationId,
        req.user._id,
        req.user.username,
        'DELETE',
        'STOCK_TRANSFER',
        `Đã xóa phiếu chuyển kho: ${deletedCodes}`,
        '',
        'SUCCESS',
        fromWarehouseId || null
      )
    })

    responseHelper.success(
      res,
      null,
      `Xóa thành công ${req.body.ids.length} phiếu chuyển kho và hoàn tác tồn kho`
    )
  } catch (error) {
    if (error instanceof BusinessError) {
      // Expected business errors - no logging to reduce terminal noise
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

// LOCK Stock Transfer
export const lockStockTransfer = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const transfer = await StockTransfer.findOne({
      _id: id,
      organization: organizationId
    })
    if (!transfer) {
      return responseHelper.error(res, 'Không tìm thấy phiếu chuyển kho', 404)
    }

    if (transfer.isLocked) {
      return responseHelper.error(res, 'Phiếu chuyển kho đã được khóa trước đó', 400)
    }

    if (!transfer.items || transfer.items.length === 0) {
      return responseHelper.error(res, 'Phiếu chuyển kho không có sản phẩm nào', 400)
    }

    if (!transfer.fromWarehouse) {
      return responseHelper.error(res, 'Phiếu chuyển kho thiếu thông tin kho nguồn', 400)
    }

    // Validate items
    for (const item of transfer.items) {
      if (!item.ingredient) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin ingredient', 400)
      }
      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return responseHelper.error(res, 'Có sản phẩm với số lượng không hợp lệ', 400)
      }
      if (!item.toWarehouse) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin kho nhận', 400)
      }
    }

    await withTransaction(async (session) => {
      // Cập nhật trạng thái khóa
      const updatedTransfer = await StockTransfer.findOneAndUpdate(
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
      ).populate('lockedBy', 'name username')

      if (!updatedTransfer) {
        throw new Error('Không thể cập nhật phiếu chuyển kho')
      }

      // Chuẩn bị stockHistory items
      const fromWarehouseId = transfer.fromWarehouse._id || transfer.fromWarehouse

      const itemsSummary = transfer.items.map((item) => ({
        ingredient: item.ingredient._id || item.ingredient,
        quantity: Number(item.quantity) || 0,
        toWarehouse: item.toWarehouse._id || item.toWarehouse
      }))

      // Tạo StockHistory record
      const stockHistory = {
        transactionType: 'TRANSFER',
        documentType: 'StockTransfer',
        documentId: transfer._id,
        documentCode: transfer.code || '',
        warehouse: fromWarehouseId, // Kho chính
        fromWarehouse: fromWarehouseId, // Kho nguồn
        toWarehouse: null, //
        supplier: null,
        totalItems: transfer.items.length,
        totalQuantity: itemsSummary.reduce((sum, i) => sum + i.quantity, 0),
        items: itemsSummary,
        reason: 'Stock transfer locked',
        note: transfer.note ? `${transfer.note} (Locked)` : 'Stock transfer locked',
        transactionDate: transfer.date || new Date(),
        createdBy: req.user._id,
        updatedBy: null,
        organization: organizationId
      }

      await StockHistory.create([stockHistory], { session })
    })

    // Lấy phiếu chuyển kho đã khóa với thông tin đầy đủ
    const finalTransfer = await StockTransfer.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('lockedBy', 'name username')
      .populate('fromWarehouse', '_id name')
      .populate('items.ingredient', 'name sku unit stock')
      .populate('items.toWarehouse', '_id name')

    logActivity(
      organizationId,
      req.user?._id,
      req.user?.username,
      'LOCK',
      'STOCK_TRANSFER',
      `Đã khóa phiếu xuất "${finalTransfer.code}"`,
      finalTransfer.code,
      'SUCCESS',
      finalTransfer.warehouse?._id || null
    )

    responseHelper.success(res, finalTransfer, 'Đã khóa phiếu chuyển kho thành công')
  } catch (err) {
    responseHelper.error(res, err.message || 'Có lỗi xảy ra khi khóa phiếu chuyển kho')
  }
}
