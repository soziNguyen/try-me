import StockEntry from "../models/stockEntry.js"
import { Ingredient } from "../models/ingredient.js"
import responseHelper from "../helpers/responseHelper.js"
import mongoose from "mongoose"
import withTransaction from "../helpers/withTransaction.js"

// GET ALL
export const getAllStockEntries = async (req, res) => {
  try {
    const entries = await StockEntry
      .find({}, "_id code")
      .populate('supplier', 'name')
      .sort({ code: 1 })
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
      .populate("items.warehouse", "name")
      .lean()

    res.json({ draw, recordsTotal, recordsFiltered, data })
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// CREATE
export const createStockEntry = async (req, res) => {
  try {
    const entry = await withTransaction(async (session) => {
      const doc = new StockEntry({ ...req.body, createdBy: req.user._id })
      await doc.save(session ? { session } : {})

      // tăng tồn kho
      for (const item of doc.items) {
        await Ingredient.updateOne(
          { _id: item.ingredient },
          { $inc: { stock: item.quantity } },
          session ? { session } : {}
        )
      }
      return doc
    })

    responseHelper.success(res, entry, "Tạo phiếu nhập kho thành công")
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// UPDATE (inline edit + nested items)
export const updateStockEntry = async (req, res) => {
  try {
    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new Error("ID không hợp lệ")
      }

      // Lấy phiếu cũ & revert stock
      const oldEntry = await StockEntry.findById(id).session(session)
      if (!oldEntry) {
        throw new Error("Phiếu nhập không tồn tại")
      }
      for (const itm of oldEntry.items) {
        if (itm.ingredient) {
          await Ingredient.updateOne(
            { _id: itm.ingredient },
            { $inc: { stock: -Math.abs(itm.quantity) } },
            { session }
          )
        }
      }

      // Normalize dữ liệu từ req.body
      const normalized = {}
      for (const [key, value] of Object.entries(req.body)) {
        if (key.endsWith(".quantity") || key.endsWith(".unitPrice")) {
          const raw = value?.toString().trim()
          let num = raw === "" ? 0 : Number(raw)
          if (num < 0) num = 0
          normalized[key] = num
        }
        else if (
          key === "supplier" ||
          key.endsWith(".ingredient") ||
          key.endsWith(".warehouse")
        ) {
          normalized[key] = value === "" ? null : value
        }
        else {
          normalized[key] = value
        }
      }
      normalized.updatedBy = req.user._id

      const newEntry = await StockEntry.findByIdAndUpdate(
        id,
        { $set: normalized },
        { new: true, session }
      )
      if (!newEntry) {
        throw new Error("Cập nhật thất bại")
      }

      // Cập nhật tồn kho theo phiếu mới
      for (const itm of newEntry.items) {
        if (itm.ingredient) {
          await Ingredient.updateOne(
            { _id: itm.ingredient },
            { $inc: { stock: Math.abs(itm.quantity) },
              $set: {
                costPrice: itm.unitPrice,
                supplier: newEntry.supplier
              } 
            },
            { session }
          )
        }
      }

      await newEntry.populate("supplier", "name")
      await newEntry.populate("items.ingredient", "name")
      await newEntry.populate("items.warehouse", "name")

      return newEntry
    })

    responseHelper.success(res, updatedDoc, "Cập nhật phiếu nhập kho thành công")
  } catch (err) {
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

      // Trừ tồn kho
      for (const entry of entries) {
        for (const item of entry.items) {
          await Ingredient.updateOne(
            { _id: item.ingredient },
            { $inc: { stock: -Math.abs(item.quantity) } },
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
