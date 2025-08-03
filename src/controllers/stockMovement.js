import StockEntry from "../models/stockEntry.js";
import StockMovement from "../models/stockMovement.js";
import Ingredient from "../models/ingredient.js";
import responseHelper from "../helpers/responseHelper.js";
import mongoose from "mongoose";

// Service function để tạo stock movements
const createStockMovements = async (stockEntry, session) => {
  const movements = [];
  
  for (const item of stockEntry.items) {
    if (item.ingredient && item.quantity > 0 && item.warehouse) {
      movements.push({
        ingredient: item.ingredient,
        fromWarehouse: item.warehouse,  // Kho nhận hàng
        toWarehouse: null,              // Import không có kho nguồn
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        type: 'Import',
        reference: stockEntry._id,
        onModel: 'StockEntry',
        note: `Import from supplier: ${stockEntry.supplier?.name || 'N/A'}`,
        date: stockEntry.date
      });
    }
  }
  
  if (movements.length > 0) {
    await StockMovement.insertMany(movements, { session });
  }
  
  return movements;
};

// Service function để update ingredient stock
const updateIngredientStock = async (movements, operation = 'add', session) => {
  const stockUpdates = {};
  
  movements.forEach(movement => {
    const key = movement.ingredient.toString();
    if (!stockUpdates[key]) {
      stockUpdates[key] = 0;
    }
    
    if (operation === 'add') {
      stockUpdates[key] += movement.quantity;
    } else if (operation === 'subtract') {
      stockUpdates[key] -= movement.quantity;
    }
  });
  
  // Batch update ingredients stock
  for (const [ingredientId, stockChange] of Object.entries(stockUpdates)) {
    if (stockChange !== 0) {
      await Ingredient.findByIdAndUpdate(
        ingredientId,
        { $inc: { stock: stockChange } },
        { session }
      );
    }
  }
};

// CREATE - với stock movement
export const createStockEntry = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const newEntry = new StockEntry({
      ...req.body,
      createdBy: req.user._id
    });
    
    await newEntry.save({ session });
    
    // Tạo stock movements
    const movements = await createStockMovements(newEntry, session);
    
    // Cập nhật ingredient stock
    await updateIngredientStock(movements, 'add', session);
    
    await session.commitTransaction();
    responseHelper.success(res, newEntry, "Tạo phiếu nhập kho thành công");
  } catch (error) {
    await session.abortTransaction();
    responseHelper.error(res, error.message);
  } finally {
    session.endSession();
  }
};

// UPDATE - với xử lý stock movement
export const updateStockEntry = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params
        const updateFields = req.body

        const stockEntry = await StockEntry.findById(id).session(session)
        if (!stockEntry) {
            await session.abortTransaction();
            return responseHelper.error(res, "Phiếu nhập kho không tồn tại", 404)
        }

        const dataUpdate = {}
        let needRecalculateMovements = false;
        
        // Xử lý các field
        for (const [field, value] of Object.entries(updateFields)) {
            if (field === 'code') {
                if (value && value !== stockEntry.code) {
                    const existing = await StockEntry.findOne({
                        _id: { $ne: id },
                        code: value
                    }).session(session)
                    if (existing) {
                        await session.abortTransaction();
                        return responseHelper.error(res, "Mã phiếu đã tồn tại", 400)
                    }
                }
                dataUpdate.code = value
            }
            else if (field === 'date') {
                dataUpdate.date = value
            }
            else if (field === 'supplier') {
                dataUpdate.supplier = (value === "" || !value) ? null : value
            }
            else if (field === 'note') {
                dataUpdate.note = value
            }
            else if (field === 'createdBy') {
                dataUpdate.createdBy = value === "" ? null : value
            }
            else if (field.startsWith('items.')) {
                // Items thay đổi → cần recalculate movements
                needRecalculateMovements = true;
                
                const parts = field.split('.')
                const index = parseInt(parts[1])
                const itemField = parts[2]
                
                const currentItems = [...(stockEntry.items || [])]
                
                while (currentItems.length <= index) {
                    currentItems.push({
                        ingredient: null,
                        quantity: 0,
                        unitPrice: 0,
                        warehouse: null
                    })
                }
                
                // Update field cụ thể
                if (itemField === 'ingredient' || itemField === 'warehouse') {
                    currentItems[index][itemField] = value === "" ? null : value
                } else if (itemField === 'quantity' || itemField === 'unitPrice') {
                    const rawValue = value?.toString().trim();
                    currentItems[index][itemField] = rawValue === "" ? 0 : Number(rawValue);
                } else {
                    currentItems[index][itemField] = value
                }
                
                dataUpdate.items = currentItems
            }
        }

        if (Object.keys(dataUpdate).length === 0) {
            await session.abortTransaction();
            return responseHelper.error(res, "Không có dữ liệu để cập nhật", 400)
        }

        // Nếu items thay đổi, cần recalculate stock movements
        if (needRecalculateMovements) {
            // 1. Lấy movements cũ và rollback stock
            const oldMovements = await StockMovement.find({
                reference: id,
                onModel: 'StockEntry'
            }).session(session);
            
            if (oldMovements.length > 0) {
                await updateIngredientStock(oldMovements, 'subtract', session);
                await StockMovement.deleteMany({
                    reference: id,
                    onModel: 'StockEntry'
                }, { session });
            }
            
            // 2. Update stock entry
            const updated = await StockEntry.findByIdAndUpdate(id, dataUpdate, { 
                new: true,
                runValidators: false,
                session
            });
            
            // 3. Tạo movements mới và update stock
            const newMovements = await createStockMovements(updated, session);
            await updateIngredientStock(newMovements, 'add', session);
        } else {
            // Chỉ update thông tin, không ảnh hưởng stock
            await StockEntry.findByIdAndUpdate(id, dataUpdate, { 
                new: true,
                runValidators: false,
                session
            });
        }

        // Lấy data cuối cùng để return
        const finalResult = await StockEntry.findById(id)
            .populate('supplier', 'name')
            .populate('items.ingredient', 'name')
            .populate('items.warehouse', 'name')
            .populate('createdBy', 'username')
            .session(session);

        await session.commitTransaction();
        responseHelper.success(res, finalResult, "Cập nhật phiếu nhập kho thành công")
    } catch (error) {
        await session.abortTransaction();
        responseHelper.error(res, error.message)
    } finally {
        session.endSession();
    }
}

// DELETE - với rollback stock movement  
export const deleteStockEntries = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await session.abortTransaction();
      return responseHelper.error(res, "Không có phiếu nào được chọn", 400);
    }

    // Lấy tất cả movements liên quan
    const movements = await StockMovement.find({
      reference: { $in: ids },
      onModel: 'StockEntry'
    }).session(session);
    
    // Rollback ingredient stock
    if (movements.length > 0) {
      await updateIngredientStock(movements, 'subtract', session);
      
      // Xóa movements
      await StockMovement.deleteMany({
        reference: { $in: ids },
        onModel: 'StockEntry'
      }, { session });
    }
    
    // Xóa stock entries
    const result = await StockEntry.deleteMany({ _id: { $in: ids } }, { session });
    
    await session.commitTransaction();
    responseHelper.success(res, result.deletedCount, "Xóa thành công");
  } catch (error) {
    await session.abortTransaction();
    responseHelper.error(res, error.message);
  } finally {
    session.endSession();
  }
};