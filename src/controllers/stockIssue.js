import mongoose from "mongoose"
import StockIssue from "../models/stockIssue.js"
import IngredientStock from "../models/ingredientStock.js"
import { Ingredient } from "../models/ingredient.js"
import Warehouse from "../models/warehouse.js"
import responseHelper from "../helpers/responseHelper.js"
import withTransaction from "../helpers/withTransaction.js"
import { generateDocumentCode } from "../helpers/common.js"
import { lookupRef } from "../helpers/lookupHelper.js"

// GET ALL
export const getAllStockIssues = async (req, res) => {
  try {
    const issues = await StockIssue.aggregate([
      {
        $lookup: {
          from: "Warehouses",
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouse"
        }
      },
      { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $project: { _id: 1, code: 1, reason: 1, "warehouse.name": 1 } }
    ])
    responseHelper.success(res, issues)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DATATABLE SERVER-SIDE
export const getStockIssues = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query["search[value]"] || "").trim()
    const colIdx = req.query["order[0][column]"]
    const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
    const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

    const pipeline = [
      ...lookupRef('warehouse', 'Warehouses'),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' }),
    ]    

    // Search before grouping
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: "i" } },
            { reason: { $regex: searchValue, $options: "i" } },
            { note: { $regex: searchValue, $options: "i" } },
            { "warehouse.name": { $regex: searchValue, $options: "i" } },
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

    // Group và filter items rỗng
    pipeline.push(
      {
        $addFields: {
          "items.ingredient": {
            _id: "$ingredient._id",
            name: "$ingredient.name"
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          code: { $first: "$code" },
          reason: { $first: "$reason" },
          note: { $first: "$note" },
          date: { $first: "$date" },
          warehouse: { $first: "$warehouse" },
          createdAt: { $first: "$createdAt" },
          items: { 
            $push: {
              $cond: {
                if: { $ne: ["$items.ingredient", null] },
                then: "$items",
                else: "$$REMOVE"
              }
            }
          },
          isLocked: { $first: "$isLocked" }
        }
      }
    )

    // Đếm sau lọc
    const countPipeline = [...pipeline, { $count: "count" }]
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
    const recordsTotal = await StockIssue.countDocuments()

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
    
    const stockIssue = await StockIssue.findById(id)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('items.ingredient', 'name unit')
      .lean()
    
    if (!stockIssue) {
      return responseHelper.error(res, 'Không tìm thấy phiếu xuất', 404)
    }
    
    responseHelper.success(res, stockIssue, 'Lấy thông tin phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// CREATE
export const createStockIssue = async (req, res) => {
  try {
    const issue = await withTransaction(async (session) => {
      const code = await generateDocumentCode(StockIssue, 'SI')
      const date = new Date()
      const doc = new StockIssue({
        date: date,
        createdBy: req.user._id,
        code: code
       })
      await doc.save({ session })
      return doc
    })
    responseHelper.success(res, { id: issue._id, code: issue.code }, "Khởi tạo phiếu xuất thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UPDATE (form)
export const updateStockIssue = async (req, res) => {
  try {
    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new Error('ID không hợp lệ')
      }

      const oldIssue = await StockIssue.findById(id).session(session)
      if (!oldIssue) throw new Error('Phiếu xuất không tồn tại')
      if (oldIssue.isLocked) throw new Error('Phiếu xuất đã bị khóa, không thể chỉnh sửa')

      const { warehouse, reason, note, items: rawItems = [] } = req.body

      // Validate input
      if (!warehouse) throw new Error('Vui lòng chọn kho xuất')
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new Error('Vui lòng thêm ít nhất một sản phẩm')
      }

      // Chuẩn hóa items - lọc bỏ item có quantity = 0
      const newItems = rawItems
        .map(item => ({
          ingredient: item.ingredient,
          quantity: Math.abs(parseFloat(item.quantity) || 0)
        }))
        .filter(item => item.ingredient && item.quantity > 0)

      if (newItems.length === 0) throw new Error('Không có sản phẩm hợp lệ để xuất')

      // Tính toán thay đổi tồn kho
      const stockChanges = new Map() // key: ingredient_warehouse, value: {ingredient, warehouse, change}
      
      // Hoàn trả items cũ (nếu có)
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
          warehouse: stockChange.warehouse
        }).session(session)

        const currentStock = stock?.quantity || 0
        const requiredStock = Math.abs(stockChange.change) // Số lượng cần xuất
        
        if (currentStock < requiredStock) {
          const ingredientDoc = await Ingredient.findById(stockChange.ingredient, 'name').session(session)
          const warehouseDoc = await Warehouse.findById(stockChange.warehouse, 'name').session(session)
          throw new Error(
            `Không đủ tồn kho cho "${ingredientDoc?.name || 'nguyên liệu'}" tại kho "${warehouseDoc?.name || 'không xác định'}". ` +
            `Tồn kho hiện tại: ${currentStock}, yêu cầu: ${requiredStock}`
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

      const updatedIssue = await StockIssue.findByIdAndUpdate(id, updateData, { 
        new: true, 
        session,
        runValidators: true 
      })
      if (!updatedIssue) throw new Error('Cập nhật phiếu xuất thất bại')

      // Áp dụng thay đổi tồn kho
      for (const [key, stockChange] of stockChanges) {
        if (stockChange.change === 0) continue // Không thay đổi

        await IngredientStock.updateOne(
          { ingredient: stockChange.ingredient, warehouse: stockChange.warehouse },
          { $inc: { quantity: stockChange.change } },
          { upsert: true, session }
        )
      }

      // Cập nhật tổng stock trong Ingredient
      const allAffectedIngredients = [...new Set([
        ...Array.from(stockChanges.values()).map(sc => sc.ingredient.toString())
      ])]
      await updateIngredientTotalStock(allAffectedIngredients, session)

      // Populate để trả về client
      await updatedIssue.populate([
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy', select: 'name username' },
        { path: 'updatedBy', select: 'name username' },
        { path: 'items.ingredient', select: 'name unit' }
      ])

      return updatedIssue
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DELETE - Hoàn trả kho và xóa phiếu (được sửa)
export const deleteStockIssues = async (req, res) => {
  try {
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Không có phiếu nào được chọn")
      }

      const issues = await StockIssue.find({ _id: { $in: ids } }).session(session)
      if (issues.length === 0) throw new Error("Không tìm thấy phiếu xuất nào")

      const allAffectedIngredients = new Set()

      // Kiểm tra khóa và hoàn trả kho
      for (const issue of issues) {
        if (issue.isLocked) {
          throw new Error(`Phiếu xuất "${issue.code}" đã bị khóa, không thể xóa`)
        }

        // Hoàn trả tồn kho nếu phiếu có warehouse và items
        if (issue.warehouse && issue.items?.length > 0) {
          for (const item of issue.items) {
            if (item.ingredient && item.quantity > 0) {
              // Hoàn trả vào IngredientStock
              await IngredientStock.updateOne(
                { ingredient: item.ingredient, warehouse: issue.warehouse },
                { $inc: { quantity: item.quantity } },
                { upsert: true, session }
              )

              allAffectedIngredients.add(item.ingredient.toString())
            }
          }
        }
      }

      // Xóa các phiếu
      await StockIssue.deleteMany({ _id: { $in: ids } }, { session })

      // Cập nhật tổng stock cho tất cả ingredients bị ảnh hưởng
      if (allAffectedIngredients.size > 0) {
        await updateIngredientTotalStock([...allAffectedIngredients], session)
      }
    })

    responseHelper.success(res, null, "Xóa phiếu xuất thành công và hoàn trả tồn kho")
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// LOCK - Khóa phiếu xuất để không thể chỉnh sửa
export const lockStockIssue = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const issue = await StockIssue.findById(id)
    if (!issue) {
      return responseHelper.error(res, 'Không tìm thấy phiếu xuất', 404)
    }

    if (issue.isLocked) {
      return responseHelper.error(res, 'Phiếu xuất đã được khóa trước đó', 400)
    }

    // Kiểm tra phiếu có đầy đủ thông tin không
    if (!issue.warehouse || !issue.items || issue.items.length === 0) {
      return responseHelper.error(res, 'Không thể khóa phiếu xuất chưa hoàn thành', 400)
    }

    const updatedIssue = await StockIssue.findByIdAndUpdate(
      id, 
      { 
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: req.user._id
      }, 
      { new: true }
    )

    responseHelper.success(res, updatedIssue, 'Đã khóa phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

async function updateIngredientTotalStock(ingredientIds, session) {
  if (!Array.isArray(ingredientIds) || ingredientIds.length === 0) return

  for (const ingId of ingredientIds) {
    const objectId = mongoose.Types.ObjectId.isValid(ingId) 
      ? new mongoose.Types.ObjectId(String(ingId)) 
      : ingId
      
    const totalStockAgg = await IngredientStock.aggregate([
      { $match: { ingredient: objectId } },
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
    ]).session(session)
    
    const totalStock = totalStockAgg[0]?.totalQuantity || 0
    
    await Ingredient.updateOne(
      { _id: objectId },
      { $set: { stock: totalStock } },
      { session }
    )
  }
}