import mongoose from "mongoose"
import StockIssue from "../models/stockIssue.js"
import IngredientStock from "../models/ingredientStock.js"
import { Ingredient } from "../models/ingredient.js"
import responseHelper from "../helpers/responseHelper.js"
import withTransaction from "../helpers/withTransaction.js"
import { generateDocumentCode } from "../helpers/common.js"
import { lookupRef } from "../helpers/lookupHelper.js"

// GET ALL
export const getAllStockIssues = async (req, res) => {
  try {
    const issues = await StockIssue.aggregate([
      { $sort: { createdAt: -1 } },
      { $project: { _id: 1, code: 1, reason: 1 } }
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
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' }),
      ...lookupRef('items.warehouse', 'Warehouses', { as: 'warehouse' }),
    ]    

    // Search before grouping
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: "i" } },
            { reason: { $regex: searchValue, $options: "i" } },
            { note: { $regex: searchValue, $options: "i" } },
            { "ingredient.name": { $regex: searchValue, $options: "i" } },
            { "warehouse.name": { $regex: searchValue, $options: "i" } },
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

    // Thêm addFields và group
    pipeline.push(
      {
        $addFields: {
          "items.ingredient": {
            _id: "$ingredient._id",
            name: "$ingredient.name"
          },
          "items.warehouse": {
            _id: "$warehouse._id",
            name: "$warehouse.name",
            location: "$warehouse.location"
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
          createdAt: { $first: "$createdAt" },
          items: { $push: "$items" },
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

    // Secondary sort để đảm bảo thứ tự ổn định
    if (sortField !== '_id') {
      sortObj['_id'] = sortDir
    }

    pipeline.push({ $sort: sortObj })

    // Pagination
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    pipeline.push({
      $project: {
        ingredient: 0,
        warehouse: 0
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
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('items.ingredient', 'name unit')
      .populate('items.warehouse', 'name location')
      .lean()
    
    if (!stockIssue) {
      return responseHelper.error(res, 'Không tìm thấy phiếu xuất', 404)
    }
    
    responseHelper.success(res, stockIssue, 'Lấy thông tin phiếu xuất thành công')
  } catch (err) {
    console.error('Get stock issue error:', err)
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
      await doc.save(session ? { session } : {})
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

      // Lấy phiếu xuất cũ
      const oldIssue = await StockIssue.findById(id).session(session)
      if (!oldIssue) throw new Error('Phiếu xuất không tồn tại')

      if (oldIssue.isLocked) {
        throw new Error('Phiếu xuất đã bị khóa, không thể chỉnh sửa')
      }

      // Hoàn tồn kho cũ vào IngredientStock (vì đã trừ trước đó)
      for (const item of oldIssue.items) {
        if (item.ingredient && item.warehouse && item.quantity) {
          await IngredientStock.updateOne(
            { ingredient: item.ingredient, warehouse: item.warehouse },
            { $inc: { quantity: Math.abs(item.quantity) } },
            { session }
          )
        }
      }

      // Lấy dữ liệu mới từ form
      const { reason, note, items: rawItems = [] } = req.body

      // Chuẩn hóa dữ liệu items
      const items = rawItems.map(item => ({
        ingredient: item.ingredient,
        warehouse: item.warehouse,
        quantity: Math.abs(parseFloat(item.quantity) || 0)
      }))

      // Kiểm tra tồn kho trước khi xuất
      for (const item of items) {
        if (item.ingredient && item.warehouse && item.quantity > 0) {
          const stock = await IngredientStock.findOne({
            ingredient: item.ingredient,
            warehouse: item.warehouse
          }).session(session)

          if (!stock || stock.quantity < item.quantity) {
            const ingredientDoc = await mongoose.model('Ingredient').findById(item.ingredient).session(session)
            const warehouseDoc = await mongoose.model('Warehouse').findById(item.warehouse).session(session)
            throw new Error(
              `Không đủ tồn kho cho ${ingredientDoc?.name || 'nguyên liệu'} tại kho ${warehouseDoc?.name || 'không xác định'}. ` +
              `Tồn kho hiện tại: ${stock?.quantity || 0}`
            )
          }
        }
      }

      const updateData = {
        reason,
        note,
        items,
        updatedBy: req.user._id
      }

      // Cập nhật phiếu xuất
      const newIssue = await StockIssue.findByIdAndUpdate(id, updateData, { new: true, session })
      if (!newIssue) throw new Error('Cập nhật thất bại')

      // Trừ tồn kho mới từ IngredientStock
      for (const item of newIssue.items) {
        if (item.ingredient && item.warehouse && item.quantity) {
          await IngredientStock.updateOne(
            { ingredient: item.ingredient, warehouse: item.warehouse },
            { $inc: { quantity: -Math.abs(item.quantity) } },
            { session }
          )
        }
      }

      // Cập nhật lại tổng tồn kho trong Ingredient
      const updatedIngredientIds = [...new Set(newIssue.items.map(i => i.ingredient.toString()))]

      for (const ingId of updatedIngredientIds) {
        const totalStockAgg = await IngredientStock.aggregate([
          { $match: { ingredient: new mongoose.Types.ObjectId(ingId) } },
          { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
        ]).session(session)
        
        const totalStock = totalStockAgg[0]?.totalQuantity || 0
        
        await Ingredient.updateOne(
          { _id: ingId },
          { $set: { stock: totalStock } },
          { session }
        )
      }

      // Populate tham chiếu để trả về cho FE
      await newIssue.populate('createdBy', 'name username')
      await newIssue.populate('updatedBy', 'name username')
      await newIssue.populate('items.ingredient', 'name unit')
      await newIssue.populate('items.warehouse', 'name location')

      return newIssue
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu xuất thành công')
  } catch (err) {
    console.error('Update stock issue error:', err)
    responseHelper.error(res, err.message)
  }
}

// DELETE
export const deleteStockIssues = async (req, res) => {
  try {
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Không có phiếu nào được chọn")
      }

      // Lấy các phiếu xuất
      const issues = await StockIssue.find({ _id: { $in: ids } }).session(session)

      // Hoàn tồn kho vào IngredientStock (vì đã trừ khi tạo phiếu)
      for (const issue of issues) {
        if (issue.isLocked) {
          throw new Error(`Phiếu xuất ${issue.code} đã bị khóa, không thể xóa`)
        }

        for (const item of issue.items) {
          const { ingredient, warehouse, quantity } = item
          await IngredientStock.updateOne(
            { ingredient, warehouse },
            { $inc: { quantity: Math.abs(quantity) } },
            { session }
          )

          await Ingredient.updateOne(
            { _id: ingredient },
            { $inc: { stock: Math.abs(quantity) } },
            { session }
          )
        }
      }

      // Xóa phiếu
      await StockIssue.deleteMany({ _id: { $in: ids } }).session(session)
    })

    responseHelper.success(res, null, "Xóa thành công và hoàn tồn kho")
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// LOCK
export const lockStockIssue = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const issue = await StockIssue.findByIdAndUpdate(id, { isLocked: true }, { new: true })

    if (!issue) {
      return responseHelper.error(res, 'Không tìm thấy phiếu xuất', 404)
    }

    responseHelper.success(res, issue, 'Đã khóa phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}