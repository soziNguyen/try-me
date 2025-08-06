import mongoose from "mongoose"
import StockEntry from "../models/stockEntry.js"
import IngredientStock from "../models/ingredientStock.js"
import { Ingredient } from "../models/ingredient.js"
import responseHelper from "../helpers/responseHelper.js"
import withTransaction from "../helpers/withTransaction.js"
import { generateDocumentCode } from "../helpers/common.js"




// GET ALL
export const getAllStockEntries = async (req, res) => {
  try {
    const entries = await StockEntry
      .find({}, "_id code")
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .lean()
    responseHelper.success(res, entries)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DATATABLE SERVER-SIDE
export const getStockEntries = async (req, res) => {
  try {
    const draw        = +req.query.draw       || 0
    const start       = +req.query.start      || 0
    const length      = +req.query.length     || 10
    const searchValue = (req.query["search[value]"] || "").trim()
    const colIdx      = req.query["order[0][column]"]
    const sortField   = req.query[`columns[${colIdx}][data]`] || "date"
    const sortDir     = req.query["order[0][dir]"] === "asc" ? 1 : -1

    const searchable = ["code", "note"]
    const baseCond   = {}
    const searchCond = searchValue
      ? { ...baseCond, $or: searchable.map(f => ({ [f]: { $regex: searchValue, $options: "i" } })) }
      : baseCond

    const recordsTotal    = await StockEntry.countDocuments(baseCond)
    const recordsFiltered = await StockEntry.countDocuments(searchCond)

    const data = await StockEntry.find(searchCond)
      .sort({ [sortField]: sortDir })
      .skip(start)
      .limit(length)
      .populate("supplier", "name")
      .populate("items.ingredient", "name")
      .populate("items.warehouse", "name location")
      .lean()

    res.json({ draw, recordsTotal, recordsFiltered, data })
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

      // 👉 Cập nhật lại tổng tồn kho trong Ingredient
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
        for (const item of entry.items) {
          const { ingredient, warehouse, quantity } = item
          await IngredientStock.updateOne(
            { ingredient, warehouse },
            { $inc: { quantity: -Math.abs(quantity) } },
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
