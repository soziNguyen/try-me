import StockEntry from "../models/stockEntry.js";
import responseHelper from "../helpers/responseHelper.js";
import mongoose from "mongoose";

// GET ALL
export const getAllStockEntries = async (req, res) => {
  try {
    const entries = await StockEntry
      .find({}, "_id code")
      .sort({ code: 1 })
      .lean();
    responseHelper.success(res, entries);
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// DATATABLE SERVER-SIDE
export const getStockEntries = async (req, res) => {
  try {
    const draw               = parseInt(req.query.draw)    || 0;
    const start              = parseInt(req.query.start)   || 0;
    const length             = parseInt(req.query.length)  || 10;
    const searchValue        = (req.query["search[value]"] || "").trim();

    const sortColumnIndex    = req.query["order[0][column]"];
    const sortField          = req.query[`columns[${sortColumnIndex}][data]`] || "date";
    const sortOrder          = req.query["order[0][dir]"] === "asc" ? 1 : -1;

    const searchableFields   = ["code", "note"];
    const baseCondition      = {};
    const searchCondition    = searchValue
      ? {
          ...baseCondition,
          $or: searchableFields.map(fld => ({
            [fld]: { $regex: searchValue, $options: "i" }
          }))
        }
      : baseCondition;

    const totalRecords       = await StockEntry.countDocuments(baseCondition);
    const filteredRecords    = await StockEntry.countDocuments(searchCondition);

    const data = await StockEntry.find(searchCondition)
      .sort({ [sortField]: sortOrder })
      .skip(start)
      .limit(length)
      .populate("supplier", "name")
      .populate("items.ingredient", "name")
      .populate("items.warehouse", "name")
      .lean();

    return res.json({
      draw: Number(draw),
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data
    });
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// CREATE
export const createStockEntry = async (req, res) => {
  try {
    const newEntry = new StockEntry({
      ...req.body,
      createdBy: req.user._id
    });
    await newEntry.save();
    responseHelper.success(res, newEntry, "Tạo phiếu nhập kho thành công");
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};

// UPDATE
export const updateStockEntry = async (req, res) => {
    try {
        const { id } = req.params
        const updateFields = req.body // Nhận dynamic fields từ frontend

        const stockEntry = await StockEntry.findById(id)
        if (!stockEntry) {
            return responseHelper.error(res, "Phiếu nhập kho không tồn tại", 404)
        }

        const dataUpdate = {}
        
        // Xử lý từng field trong request
        for (const [field, value] of Object.entries(updateFields)) {
            if (field === 'code') {
                // Kiểm tra trùng code
                if (value && value !== stockEntry.code) {
                    const existing = await StockEntry.findOne({
                        _id: { $ne: id },
                        code: value
                    })
                    if (existing) {
                        return responseHelper.error(res, "Mã phiếu đã tồn tại", 400)
                    }
                }
                dataUpdate.code = value
            }
            else if (field === 'date') {
                dataUpdate.date = value
            }
            else if (field === 'supplier') {
                // Supplier là field đơn - ObjectId hoặc null
                dataUpdate.supplier = (value === "" || !value) ? null : value
            }
            else if (field === 'note') {
                dataUpdate.note = value
            }
            else if (field === 'createdBy') {
                dataUpdate.createdBy = value === "" ? null : value
            }
            else if (field.startsWith('items.')) {
                // Xử lý nested field: items.0.ingredient, items.0.quantity, etc.
                const parts = field.split('.')
                const index = parseInt(parts[1])
                const itemField = parts[2]
                
                // Lấy items hiện tại
                const currentItems = [...(stockEntry.items || [])]
                
                // Đảm bảo có item tại index
                while (currentItems.length <= index) {
                    currentItems.push({
                        ingredient: null,
                        quantity: 0,        // Set default = 1 để tránh required validation
                        unitPrice: 0,
                        warehouse: null
                    })
                }

                // Update field cụ thể
                if (itemField === 'ingredient' || itemField === 'warehouse') {
                    currentItems[index][itemField] = value === "" ? null : value
                } else if (itemField === 'quantity' || itemField === 'unitPrice') {
                    // Xử lý số lượng và giá như field stock
                    const rawValue = value?.toString().trim();
                    currentItems[index][itemField] = rawValue === "" ? 0 : Number(rawValue);
                } else {
                    currentItems[index][itemField] = value
                }
                
                dataUpdate.items = currentItems
            }
            else {
                return responseHelper.error(res, `Field ${field} không được hỗ trợ`, 400)
            }
        }

        if (Object.keys(dataUpdate).length === 0) {
            return responseHelper.error(res, "Không có dữ liệu để cập nhật", 400)
        }

        const updated = await StockEntry.findByIdAndUpdate(id, dataUpdate, { 
            new: true,
            runValidators: false  // ← Tắt validation cho inline edit
        }).populate('supplier', 'name')
          .populate('items.ingredient', 'name')
          .populate('items.warehouse', 'name')
          .populate('createdBy', 'username')

        responseHelper.success(res, updated, "Cập nhật phiếu nhập kho thành công")
    } catch (error) {
        responseHelper.error(res, error.message)
    }
}

// DELETE (xóa cứng)
export const deleteStockEntries = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseHelper.error(res, "Không có phiếu nào được chọn", 400);
    }

    const result = await StockEntry.deleteMany({ _id: { $in: ids } });
    responseHelper.success(res, result.deletedCount, "Xóa thành công");
  } catch (error) {
    responseHelper.error(res, error.message);
  }
};
