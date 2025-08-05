import mongoose from "mongoose"
import StockEntry from "../models/stockEntry.js"
import { Ingredient } from "../models/ingredient.js"
import responseHelper from "../helpers/responseHelper.js"
import withTransaction from "../helpers/withTransaction.js"


export const generateStockEntryCode = async (prefix = 'SE') => {
  try {
    const now = new Date()
    const year = now.getFullYear().toString().substr(-2) // 24 cho 2024
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const datePrefix = `${prefix}-${year}${month}${day}`
    
    // Tìm mã cao nhất trong ngày hiện tại
    const lastEntry = await StockEntry.findOne({
      code: { $regex: `^${datePrefix}-\\d{3}$`}
    }).sort({ code: -1 }).lean()
    
    let nextNumber = 1
    if (lastEntry && lastEntry.code) {
      const lastNumber = parseInt(lastEntry.code.split('-')[2])
      nextNumber = lastNumber + 1
    }
    
    // Format: SE-241205-001, SE-241205-002...
    const formattedNumber = nextNumber.toString().padStart(3, '0')
    return `${datePrefix}-${formattedNumber}`
    
  } catch (error) {
    // Fallback
    const now = new Date()
    const year = now.getFullYear().toString().substr(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `SE-${year}${month}${day}-${randomNum}`
  }
}

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
      const code = await generateStockEntryCode('SE')
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
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        throw new Error("ID không hợp lệ");
      }

      // Lấy phiếu cũ để revert stock
      const oldEntry = await StockEntry.findById(id).session(session);
      if (!oldEntry) throw new Error("Phiếu nhập không tồn tại");

      // Revert stock của items cũ
      for (const item of oldEntry.items) {
        if (item.ingredient && item.quantity) {
          await Ingredient.updateOne(
            { _id: item.ingredient },
            { $inc: { stock: -Math.abs(item.quantity) } },
            { session }
          );
        }
      }

      // Chuẩn bị dữ liệu update
      const {
        supplier,
        note,
        items: rawItems = []
      } = req.body;
      
      let totalAmount = 0; // Biến tạm để tính tổng tiền của cả phiếu

      const items = rawItems.map(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const itemTotal = quantity * unitPrice; // Tính total cho từng item
        
        totalAmount += itemTotal; // Cộng dồn vào tổng tiền của phiếu nhập

        return {
          ingredient: item.ingredient,
          warehouse: item.warehouse,
          quantity: quantity,
          unitPrice: unitPrice,
          total: itemTotal // Tính tổng tiền cho từng item
        };
      });

      const updateData = { 
        supplier, 
        note, 
        items, 
        total: totalAmount, // Cập nhật tổng tiền của phiếu
        updatedBy: req.user._id 
      };

      // Cập nhật phiếu
      const newEntry = await StockEntry.findByIdAndUpdate(
        id,
        updateData,
        { new: true, session }
      );
      if (!newEntry) throw new Error("Cập nhật thất bại");

      // Cập nhật stock với items mới
      for (const item of newEntry.items) {
        if (item.ingredient && item.quantity) {
          await Ingredient.updateOne(
            { _id: item.ingredient },
            {
              $inc: { stock: Math.abs(item.quantity) },
              $set: { 
                costPrice: item.unitPrice || 0,
                supplier: newEntry.supplier 
              }
            },
            { session }
          );
        }
      }

      // Populate để trả về đầy đủ thông tin
      await newEntry.populate("supplier", "name")
      await newEntry.populate("createdBy", "name username")
      await newEntry.populate("updatedBy", "name username")
      await newEntry.populate("items.ingredient", "name")
      await newEntry.populate("items.warehouse", "name location");

      return newEntry;
    });

    responseHelper.success(res, updatedDoc, "Cập nhật phiếu nhập thành công");
  } catch (err) {
    console.error("Update stock entry error:", err);
    responseHelper.error(res, err.message);
  }
};

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
