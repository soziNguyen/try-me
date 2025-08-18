import mongoose from "mongoose"
import StockTransfer from "./model.js"
import Warehouse from "../../inventory/warehouse/model.js"
import IngredientStock from "../../inventory/ingredient-stock/model.js"
import { Ingredient } from "../../inventory/ingredient/model.js"
import responseHelper from "../../../helpers/responseHelper.js"
import withTransaction from "../../../helpers/withTransaction.js"
import { generateDocumentCode } from "../../../helpers/common.js"
import { lookupRef } from "../../../helpers/lookupHelper.js"
import StockHistory from "../stock-history/model.js"
import { getCurrentOrg } from '../../../helpers/orgHelper.js'

// DATATABLE SERVER-SIDE
export const getStockTransfers = async (req, res) => {
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

    const baseMatch = { organization: organizationId }

    // Base pipeline (lookup trước khi group)
    const pipeline = [
      { $match: baseMatch },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      ...lookupRef("items.ingredient", "Ingredients", { as: "ingredient" }),
      ...lookupRef("items.fromWarehouse", "Warehouses", { as: "fromWarehouse" }),
      ...lookupRef("items.toWarehouse", "Warehouses", { as: "toWarehouse" }),
      ...lookupRef("createdBy", "Users", { as: "createdBy" })
    ]

    // Search nếu có
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: "i" } },
            { note: { $regex: searchValue, $options: "i" } },
            { "createdBy.name": { $regex: searchValue, $options: "i" } },
            { "fromWarehouse.name": { $regex: searchValue, $options: "i" } },
            { "toWarehouse.name": { $regex: searchValue, $options: "i" } },
            { "ingredient.name": { $regex: searchValue, $options: "i" } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: "$items.quantity" },
                  regex: searchValue
                }
              }
            },
            {
              $expr: {
                $regexMatch: {
                  input: { $dateToString: { format: "%d/%m/%Y", date: "$date" } },
                  regex: searchValue,
                  options: "i"
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
          "items.ingredient": {
            _id: "$ingredient._id",
            name: "$ingredient.name"
          },
          "items.fromWarehouse": {
            _id: "$fromWarehouse._id",
            name: "$fromWarehouse.name",
            location: "$fromWarehouse.location"
          },
          "items.toWarehouse": {
            _id: "$toWarehouse._id",
            name: "$toWarehouse.name",
            location: "$toWarehouse.location"
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          code: { $first: "$code" },
          note: { $first: "$note" },
          date: { $first: "$date" },
          createdAt: { $first: "$createdAt" },
          createdBy: { $first: "$createdBy" },
          items: { $push: "$items" },
          isLocked: { $first: "$isLocked" },
          lockedAt: { $first: "$lockedAt" },
          lockedBy: { $first: "$lockedBy" }
        }
      }
    )

    // Sort object
    const sortObj = { [sortField]: sortDir }

    // Dùng $facet để vừa count vừa phân trang
    pipeline.push({
      $facet: {
        metadata: [
          { $count: "total" }
        ],
        data: [
          { $sort: sortObj },
          { $skip: start },
          { $limit: length }
        ]
      }
    })

    // Chạy query
    const result = await StockTransfer.aggregate(pipeline)

    const recordsFiltered = result[0]?.metadata[0]?.total || 0
    const data = result[0]?.data || []

    // Tổng số phiếu không filter
    const recordsTotal = await StockTransfer.countDocuments(baseMatch)

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
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)
    
    const stockTransfer = await StockTransfer.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('lockedBy', 'name username')
      .populate('items.ingredient', 'name unit')
      .populate('items.fromWarehouse', 'name location')
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
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)
    const transfer = await withTransaction(async (session) => {
      const code = await generateDocumentCode(StockTransfer, 'ST')
      const date = new Date()
      const doc = new StockTransfer({
        code: code,
        date: date,
        createdBy: req.user._id,
        organization: organizationId
       })
      await doc.save(session ? { session } : {})
      return doc
    })
    responseHelper.success(res, { id: transfer._id, code: transfer.code }, "Khởi tạo phiếu chuyển kho thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UPDATE (form)
export const updateStockTransferFromForm = async (req, res) => {
  try {
    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new Error('ID không hợp lệ')
      }

      const organizationId = getCurrentOrg(req)
      if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

      // Lấy phiếu chuyển kho cũ
      const oldTransfer = await StockTransfer.findOne({
        _id: id,
        organization: organizationId
      }).session(session)
      if (!oldTransfer) throw new Error('Phiếu chuyển kho không tồn tại')

      if (oldTransfer.isLocked) {
        throw new Error('Phiếu chuyển kho đã bị khóa, không thể chỉnh sửa')
      }

      // Lấy dữ liệu mới từ form
      const { note, items: rawItems = [] } = req.body
      // Chuẩn hóa dữ liệu items mới với validation
      const newItems = await Promise.all(
        rawItems
          .filter(item => item.ingredient && item.fromWarehouse && item.toWarehouse && item.quantity > 0)
          .map(async (item) => {
            const quantity = parseFloat(item.quantity) || 0
            if (quantity <= 0) {
              throw new Error('Số lượng chuyển phải lớn hơn 0')
            }

            // Validate: Kho nguồn và kho đích không được giống nhau
            if (item.fromWarehouse === item.toWarehouse) {
              throw new Error('Kho nguồn và kho đích không được giống nhau')
            }

            // Validate: Kiểm tra tồn tại của ingredient và warehouse
            const [ingredient, fromWarehouse, toWarehouse] = await Promise.all([
              Ingredient.findOne({
                _id: item.ingredient,
                organization: organizationId
              }).session(session),
              Warehouse.findOne({
                _id: item.fromWarehouse,
                organization: organizationId
              }).session(session),
              Warehouse.findOne({ 
                _id: item.toWarehouse, 
                organization: organizationId
              }).session(session)
            ])

            if (!ingredient) throw new Error(`Nguyên liệu không tồn tại: ${item.ingredient}`)
            if (!fromWarehouse) throw new Error(`Kho nguồn không tồn tại: ${item.fromWarehouse}`)
            if (!toWarehouse) throw new Error(`Kho đích không tồn tại: ${item.toWarehouse}`)

            return {
              ingredient: item.ingredient,
              fromWarehouse: item.fromWarehouse,
              toWarehouse: item.toWarehouse,
              quantity
            }
          })
      )

      if (newItems.length === 0) {
        throw new Error('Phải có ít nhất một mặt hàng để chuyển kho')
      }

      // TÍNH TOÁN ẢNH HƯỞNG NET (không hoàn tác ngay)
      const stockChanges = new Map() // key: ingredient_warehouse, value: net change

      // Tính toán thay đổi từ việc xóa items cũ (hoàn tác)
      for (const oldItem of oldTransfer.items) {
        if (oldItem.ingredient && oldItem.quantity && oldItem.fromWarehouse && oldItem.toWarehouse) {
          const fromKey = `${oldItem.ingredient}_${oldItem.fromWarehouse}`
          const toKey = `${oldItem.ingredient}_${oldItem.toWarehouse}`
          
          // Hoàn tác: Cộng lại vào kho nguồn
          stockChanges.set(fromKey, (stockChanges.get(fromKey) || 0) + Math.abs(oldItem.quantity))
          // Hoàn tác: Trừ khỏi kho đích
          stockChanges.set(toKey, (stockChanges.get(toKey) || 0) - Math.abs(oldItem.quantity))
        }
      }

      // Tính toán thay đổi từ việc thêm items mới
      for (const newItem of newItems) {
        const fromKey = `${newItem.ingredient}_${newItem.fromWarehouse}`
        const toKey = `${newItem.ingredient}_${newItem.toWarehouse}`
        
        // Trừ từ kho nguồn
        stockChanges.set(fromKey, (stockChanges.get(fromKey) || 0) - Math.abs(newItem.quantity))
        // Cộng vào kho đích
        stockChanges.set(toKey, (stockChanges.get(toKey) || 0) + Math.abs(newItem.quantity))
      }

      // KIỂM TRA tồn kho có đủ cho tất cả thay đổi
      for (const [key, netChange] of stockChanges) {
        if (netChange >= 0) continue // Không cần kiểm tra nếu tăng hoặc không đổi
        
        const [ingredientId, warehouseId] = key.split('_')
        
        const currentStock = await IngredientStock.findOne({
          ingredient: ingredientId,
          warehouse: warehouseId,
          organization: organizationId
        }).session(session)

        const currentQuantity = currentStock?.quantity || 0
        const finalQuantity = currentQuantity + netChange

        if (finalQuantity < 0) {
          const [ingredient, warehouse] = await Promise.all([
            Ingredient.findOne({
              _id: ingredientId, 
              organization: organizationId
            }).select('name').session(session),
            Warehouse.findOne({ 
              _id: warehouseId,
              organization: organizationId
            }).select('name').session(session)
          ])
          
          throw new Error(
            `Không đủ tồn kho cho nguyên liệu "${ingredient?.name || 'Unknown'}" ` +
            `tại kho "${warehouse?.name || 'Unknown'}". ` +
            `Hiện có: ${currentQuantity}, Cần: ${Math.abs(netChange)}, ` +
            `Thiếu: ${Math.abs(finalQuantity)}`
          )
        }
      }

      // CẬP NHẬT phiếu chuyển kho trong database
      const updateData = {
        note,
        items: newItems,
        updatedBy: req.user._id,
        updatedAt: new Date()
      }

      const updatedTransfer = await StockTransfer.findOneAndUpdate({ 
        _id: id, 
        organization: organizationId }, 
        updateData, { 
        new: true, 
        session 
      })
      if (!updatedTransfer) throw new Error('Cập nhật thất bại')

      // ÁP DỤNG tất cả thay đổi tồn kho
      for (const [key, netChange] of stockChanges) {
        if (netChange === 0) continue // Bỏ qua nếu không có thay đổi
        
        const [ingredientId, warehouseId] = key.split('_')
        
        if (netChange > 0) {
          // Tăng tồn kho
          await IngredientStock.updateOne(
            { ingredient: ingredientId, warehouse: warehouseId, organization: organizationId },
            { 
              $inc: { quantity: netChange },
              $setOnInsert: { 
                ingredient: ingredientId, 
                warehouse: warehouseId,
                createdAt: new Date()
              }
            },
            { upsert: true, session }
          )
        } else {
          // Giảm tồn kho
          await IngredientStock.updateOne(
            { ingredient: ingredientId, warehouse: warehouseId, organization: organizationId },
            { $inc: { quantity: netChange } },
            { session }
          )
        }
      }

      // CẬP NHẬT tổng tồn kho trong Ingredient
      const affectedIngredientIds = [...new Set([
        ...oldTransfer.items.map(i => i.ingredient.toString()),
        ...updatedTransfer.items.map(i => i.ingredient.toString())
      ])]

      await Promise.all(
        affectedIngredientIds.map(async (ingId) => {
          const totalStockAgg = await IngredientStock.aggregate([
            { $match: { ingredient: new mongoose.Types.ObjectId(ingId), organization: organizationId } },
            { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
          ]).session(session)
          
          const totalStock = Math.max(0, totalStockAgg[0]?.totalQuantity || 0)
          
          return Ingredient.updateOne(
            { _id: ingId, organization: organizationId },
            { $set: { stock: totalStock, updatedAt: new Date() } },
            { session }
          )
        })
      )

      // Dọn dẹp các record có quantity = 0
      await IngredientStock.deleteMany(
        { organization: organizationId, quantity: { $lte: 0 } },
        { session }
      )

      await updatedTransfer.populate([
        { path: 'createdBy', select: 'name username' },
        { path: 'updatedBy', select: 'name username' },
        { path: 'lockedBy', select: 'name username' },
        { path: 'items.ingredient', select: 'name unit' },
        { path: 'items.fromWarehouse', select: 'name location' },
        { path: 'items.toWarehouse', select: 'name location' }
      ])

      return updatedTransfer
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu chuyển kho thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DELETE
export const deleteStockTransfers = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Không có phiếu nào được chọn")
      }

      // Validate ObjectIds
      const validIds = ids.filter(id => mongoose.isValidObjectId(id))
      if (validIds.length !== ids.length) {
        throw new Error("Một số ID không hợp lệ")
      }

      // Lấy các phiếu chuyển kho với populate để có thông tin chi tiết
      const transfers = await StockTransfer.find({ 
        _id: { $in: validIds },
        organization: organizationId
      })
        .populate('items.ingredient', 'name')
        .populate('items.fromWarehouse', 'name')
        .populate('items.toWarehouse', 'name')
        .session(session)

      if (transfers.length === 0) {
        throw new Error("Không tìm thấy phiếu chuyển kho nào")
      }

      if (transfers.length !== validIds.length) {
        throw new Error("Một số phiếu chuyển kho không tồn tại")
      }

      // Kiểm tra phiếu đã khóa
      const lockedTransfers = transfers.filter(t => t.isLocked)
      if (lockedTransfers.length > 0) {
        const lockedCodes = lockedTransfers.map(t => t.code).join(', ')
        throw new Error(`Các phiếu chuyển kho sau đã bị khóa, không thể xóa: ${lockedCodes}`)
      }

      // TÍNH TOÁN THAY ĐỔI TỒN KHO (hoàn tác tất cả transfers)
      const stockChanges = new Map() // key: ingredient_warehouse, value: quantity change
      const affectedIngredients = new Set()

      for (const transfer of transfers) {
        for (const item of transfer.items) {
          if (!item.ingredient || !item.quantity || !item.fromWarehouse || !item.toWarehouse) {
            continue
          }

          // Extract đúng ObjectId từ populated data
          const ingredientId = item.ingredient._id ? item.ingredient._id.toString() : item.ingredient.toString()
          const fromWarehouseId = item.fromWarehouse._id ? item.fromWarehouse._id.toString() : item.fromWarehouse.toString()
          const toWarehouseId = item.toWarehouse._id ? item.toWarehouse._id.toString() : item.toWarehouse.toString()
          const absQuantity = Math.abs(item.quantity)
          
          affectedIngredients.add(ingredientId)
          
          const fromKey = `${ingredientId}_${fromWarehouseId}`
          const toKey = `${ingredientId}_${toWarehouseId}`
          
          // HOÀN TÁC: Cộng lại vào kho nguồn (vì trước đó đã trừ đi)
          stockChanges.set(fromKey, (stockChanges.get(fromKey) || 0) + absQuantity)
          
          // HOÀN TÁC: Trừ khỏi kho đích (vì trước đó đã cộng vào)
          stockChanges.set(toKey, (stockChanges.get(toKey) || 0) - absQuantity)
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
            .flatMap(t => t.items)
            .find(item => {
              const itemIngredientId = item.ingredient._id ? item.ingredient._id.toString() : item.ingredient.toString()
              return itemIngredientId === ingredientId
            })
          
          const warehouseInfo = transfers
            .flatMap(t => t.items)
            .find(item => {
              const fromId = item.fromWarehouse._id ? item.fromWarehouse._id.toString() : item.fromWarehouse.toString()
              const toId = item.toWarehouse._id ? item.toWarehouse._id.toString() : item.toWarehouse.toString()
              return fromId === warehouseId || toId === warehouseId
            })
          
          const ingredientName = ingredientInfo?.ingredient?.name || 'Unknown'
          const warehouseName = warehouseInfo?.fromWarehouse?.name || 
                               warehouseInfo?.toWarehouse?.name || 'Unknown'
          
          validationErrors.push(
            `Không thể hoàn tác: Nguyên liệu "${ingredientName}" ` +
            `tại kho "${warehouseName}" sẽ thiếu ${Math.abs(finalQuantity)} đơn vị ` +
            `(hiện có: ${currentQuantity})`
          )
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(`Không thể xóa do các xung đột tồn kho:\n${validationErrors.join('\n')}`)
      }

      // ÁP DỤNG THAY ĐỔI TỒN KHO
      const stockUpdatePromises = []
      
      for (const [key, change] of stockChanges) {
        if (change === 0) continue
        
        const [ingredientId, warehouseId] = key.split('_')
        
        stockUpdatePromises.push(
          IngredientStock.updateOne(
            { ingredient: ingredientId, warehouse: warehouseId, organization: organizationId },
            { $inc: { quantity: change } },
            { session }
          )
        )
      }

      await Promise.all(stockUpdatePromises)

      // CẬP NHẬT TỔNG TỒN KHO TRONG INGREDIENT
      const ingredientUpdatePromises = Array.from(affectedIngredients).map(async (ingredientId) => {
        const totalStockAgg = await IngredientStock.aggregate([
          { $match: { ingredient: new mongoose.Types.ObjectId(String(ingredientId)), organization: organizationId } },
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
        throw new Error("Một số phiếu chuyển kho không thể xóa")
      }
    })

    responseHelper.success(
      res, 
      null, 
      `Xóa thành công ${req.body.ids.length} phiếu chuyển kho và hoàn tác tồn kho`
    )
  } catch (error) {
    responseHelper.error(res, error.message)
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
    if (!organizationId) return responseHelper.error(res, "Thiếu thông tin tổ chức", 400)

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

    // Validate items
    for (const item of transfer.items) {
      if (!item.ingredient) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin ingredient', 400)
      }
      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return responseHelper.error(res, 'Có sản phẩm với số lượng không hợp lệ', 400)
      }
      if (!item.fromWarehouse || !item.toWarehouse) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin kho xuất hoặc kho nhận', 400)
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
      const itemsSummary = transfer.items.map(item => ({
        ingredient: item.ingredient._id || item.ingredient,
        quantity: Number(item.quantity) || 0,
        fromWarehouse: item.fromWarehouse._id || item.fromWarehouse,
        toWarehouse: item.toWarehouse._id || item.toWarehouse,
      }))

      // Tạo StockHistory record
      const stockHistory = {
        transactionType: 'TRANSFER',
        documentType: 'StockTransfer',
        documentId: transfer._id,
        documentCode: transfer.code || '',
        fromWarehouse: null,  // Tổng thể phiếu thì null, chi tiết từng item có fromWarehouse
        toWarehouse: null,
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
      .populate('items.ingredient', 'name sku unit stock')
      .populate('items.fromWarehouse', 'name code')
      .populate('items.toWarehouse', 'name code')

    responseHelper.success(res, finalTransfer, 'Đã khóa phiếu chuyển kho thành công')
  } catch (err) {
    responseHelper.error(res, err.message || 'Có lỗi xảy ra khi khóa phiếu chuyển kho')
  }
}

