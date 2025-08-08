import mongoose from "mongoose"
import StockEntry from "../models/stockEntry.js"
import IngredientStock from "../models/ingredientStock.js"
import { Ingredient } from "../models/ingredient.js"
import responseHelper from "../helpers/responseHelper.js"
import withTransaction from "../helpers/withTransaction.js"
import { generateDocumentCode } from "../helpers/common.js"
import { lookupRef } from "../helpers/lookupHelper.js"
import { toVietnamTime } from "../helpers/dateHelper.js"

// GET ALL
export const getAllStockEntries = async (req, res) => {
  try {
    const entries = await StockEntry.aggregate([
      {
        $lookup: {
          from: "Suppliers",
          localField: "supplier",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $project: { _id: 1, code: 1, "supplier.name": 1 } }
    ])
    responseHelper.success(res, entries)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DATATABLE SERVER-SIDE
export const getStockEntries = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query["search[value]"] || "").trim()
    const colIdx = req.query["order[0][column]"]
    const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
    const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

    const pipeline = [
      ...lookupRef('supplier', 'Suppliers'),
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
            { note: { $regex: searchValue, $options: "i" } },
            { "supplier.name": { $regex: searchValue, $options: "i" } },
            { "ingredient.name": { $regex: searchValue, $options: "i" } },
            { "warehouse.name": { $regex: searchValue, $options: "i" } },
            { "items.quantity": { $regex: searchValue, $options: "i" } },
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
          note: { $first: "$note" },
          date: { $first: "$date" },
          supplier: { $first: "$supplier" },
          createdAt: { $first: "$createdAt" },
          items: { $push: "$items" },
          isLocked: { $first: "$isLocked" },
          lockedAt: { $first: "$lockedAt" },
          lockedBy: { $first: "$lockedBy" }
        }
      }
    )

    // Đếm sau lọc
    const countPipeline = [...pipeline, { $count: "count" }]
    const countResult = await StockEntry.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'supplier.name':
      case 'supplier':
        sortObj['supplier.name'] = sortDir
        break
      case 'code':
        sortObj['code'] = sortDir
        break
      case 'note':
        sortObj['note'] = sortDir
        break
      case 'date':
        sortObj['date'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
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

    const data = await StockEntry.aggregate(pipeline)
    const recordsTotal = await StockEntry.countDocuments()

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

// Get Stock Entry by ID (Detail)
export const getStockEntryById = async (req, res) => {
  try {
    const { id } = req.params
    
    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }
    
    const stockEntry = await StockEntry.findById(id)
      .populate('supplier', 'name')
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('lockedBy', 'name username')
      .populate('items.ingredient', 'name')
      .populate('items.warehouse', 'name location')
      .lean()
    
    if (!stockEntry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }
    
    responseHelper.success(res, stockEntry, 'Lấy thông tin phiếu nhập thành công')
  } catch (err) {
    console.error('Get stock entry error:', err)
    responseHelper.error(res, err.message)
  }
}

// CREATE
export const createStockEntry = async (req, res) => {
  try {
    const entry = await withTransaction(async (session) => {
      const code = await generateDocumentCode(StockEntry, 'SE')
      const date = new Date()
      const doc = new StockEntry({
        date: date,
        createdBy: req.user._id,
        code: code
       })
      await doc.save(session ? { session } : {})
      return doc
    })
    responseHelper.success(res, { id: entry._id, code: entry.code }, "Khởi tạo phiếu nhập thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UPDATE (form)
export const updateStockEntryFromForm = async (req, res) => {
  try {
    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new Error('ID không hợp lệ')
      }

      // Lấy phiếu nhập cũ
      const oldEntry = await StockEntry.findById(id).session(session)
      if (!oldEntry) throw new Error('Phiếu nhập không tồn tại')

      if (oldEntry.isLocked) {
        throw new Error('Phiếu nhập đã bị khóa, không thể chỉnh sửa')
      }

      // Trừ tồn kho cũ khỏi IngredientStock
      for (const item of oldEntry.items) {
        if (item.ingredient && item.warehouse && item.quantity) {
          await IngredientStock.updateOne(
            { ingredient: item.ingredient, warehouse: item.warehouse },
            { $inc: { quantity: -Math.abs(item.quantity) } },
            { session }
          )
        }
      }

      // Lấy dữ liệu mới từ form
      const { supplier, note, items: rawItems = [] } = req.body
      let totalAmount = 0

      // Chuẩn hóa dữ liệu items và tính tổng tiền
      const items = rawItems.map(item => {
        const quantity = parseFloat(item.quantity) || 0
        const unitPrice = parseFloat(item.unitPrice) || 0
        const itemTotal = quantity * unitPrice
        totalAmount += itemTotal

        return {
          ingredient: item.ingredient,
          warehouse: item.warehouse,
          quantity,
          unitPrice,
          total: itemTotal
        }
      })

      const updateData = {
        supplier,
        note,
        items,
        total: totalAmount,
        updatedBy: req.user._id
      }

      // Cập nhật phiếu nhập
      const newEntry = await StockEntry.findByIdAndUpdate(id, updateData, { new: true, session })
      if (!newEntry) throw new Error('Cập nhật thất bại')

      // Cộng tồn kho mới vào IngredientStock
      for (const item of newEntry.items) {
        if (item.ingredient && item.warehouse && item.quantity) {
          await IngredientStock.updateOne(
            { ingredient: item.ingredient, warehouse: item.warehouse },
            {
              $inc: { quantity: Math.abs(item.quantity) },
              $set: { supplier: newEntry.supplier }
            },
            { upsert: true, session }
          )
        }
      }

      // Cập nhật lại tổng tồn kho trong Ingredient
      const updatedIngredientIds = [...new Set(newEntry.items.map(i => i.ingredient.toString()))]

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
      await newEntry.populate('supplier', 'name')
      await newEntry.populate('createdBy', 'name username')
      await newEntry.populate('updatedBy', 'name username')
      await newEntry.populate('lockedBy', 'name username')
      await newEntry.populate('items.ingredient', 'name unit')
      await newEntry.populate('items.warehouse', 'name location')

      return newEntry
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu nhập thành công')
  } catch (err) {
    console.error('Update stock entry error:', err)
    responseHelper.error(res, err.message)
  }
}


// DELETE
export const deleteStockEntries = async (req, res) => {
  try {
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Không có phiếu nào được chọn")
      }

      // Lấy các phiếu nhập
      const entries = await StockEntry.find({ _id: { $in: ids } }).session(session)

      // Trừ tồn kho từ IngredientStock
      for (const entry of entries) {
        if (entry.isLocked) {
          throw new Error(`Phiếu nhập ${entry.code} đã bị khóa, không thể xóa`)
        }

        for (const item of entry.items) {
          const { ingredient, warehouse, quantity } = item
          await IngredientStock.updateOne(
            { ingredient, warehouse },
            { $inc: { quantity: -Math.abs(quantity) } },
            { session }
          )

          await Ingredient.updateOne(
            { _id: ingredient },
            { $inc: { stock: -Math.abs(quantity) } },
            { session }
          )
        }
      }

      // Xóa phiếu
      await StockEntry.deleteMany({ _id: { $in: ids } }).session(session)
    })

    responseHelper.success(res, null, "Xóa thành công và cập nhật tồn kho")
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

// LOCK Stock Entry
export const lockStockEntry = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const entry = await StockEntry.findById(id)
    if (!entry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }

    if (entry.isLocked) {
      return responseHelper.error(res, 'Phiếu nhập đã được khóa trước đó', 400)
    }

    let updatedEntry = await StockEntry.findByIdAndUpdate(
      id, 
      { 
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: req.user._id
      }, 
      { new: true }
    )
    .populate('lockedBy', 'name username')

    updatedEntry = updatedEntry.toObject()
    updatedEntry.lockedAt = toVietnamTime(updatedEntry.lockedAt)

    responseHelper.success(res, updatedEntry, 'Đã khóa phiếu nhập thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UNLOCK Stock Entry
export const unlockStockEntry = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const entry = await StockEntry.findById(id)
    if (!entry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }

    if (!entry.isLocked) {
      return responseHelper.error(res, 'Phiếu nhập chưa được khóa', 400)
    }

    const updatedEntry = await StockEntry.findByIdAndUpdate(
      id, 
      { 
        isLocked: false,
        lockedAt: null,
        lockedBy: null
      }, 
      { new: true }
    )

    responseHelper.success(res, updatedEntry, 'Đã mở khóa phiếu nhập thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}