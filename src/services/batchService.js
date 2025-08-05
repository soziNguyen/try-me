import mongoose from 'mongoose';
import { IngredientBatch } from "../models/ingredientBatch.js";
import { Ingredient } from "../models/ingredient.js";

/**
 * Tiêu thụ nguyên liệu theo FEFO/FIFO, trả về breakdown COGS và cập nhật batch.remainingQuantity.
 */
async function consumeIngredientWithCOGS(ingredientId, amountToConsume, userId, session = null) {
  let remaining = amountToConsume;
  const breakdown = [];

  const query = IngredientBatch.find({
    ingredient: ingredientId,
    remainingQuantity: { $gt: 0 },
    isActive: true
  })
    .sort({ expirationDate: 1, receivedDate: 1 });

  if (session) query.session(session);
  const batches = await query;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const deduct = Math.min(batch.remainingQuantity, remaining);
    const unitCost = batch.costPrice;
    const cost = deduct * unitCost;

    batch.remainingQuantity -= deduct;
    batch.updatedBy = userId;
    if (session) {
      await batch.save({ session });
    } else {
      await batch.save();
    }

    breakdown.push({
      batchId: batch._id,
      lotNumber: batch.lotNumber,
      usedQty: deduct,
      unitCost,
      cost
    });

    remaining -= deduct;
  }

  if (remaining > 0) {
    throw new Error(`Không đủ tồn để tiêu thụ: thiếu ${remaining} đơn vị`);
  }

  // Tính giá trị tồn còn lại sau khi tiêu thụ
  const leftoverQuery = IngredientBatch.find({
    ingredient: ingredientId,
    remainingQuantity: { $gt: 0 },
    isActive: true
  });
  if (session) leftoverQuery.session(session);
  const leftoverBatches = await leftoverQuery;

  let remainingStockValue = 0;
  for (const b of leftoverBatches) {
    remainingStockValue += b.remainingQuantity * b.costPrice;
  }

  const totalCOGS = breakdown.reduce((sum, b) => sum + b.cost, 0);

  return { totalCOGS, breakdown, remainingStockValue };
}

async function syncIngredientCache(ingredientId) {
    // 1. Tính tồn hiện tại từ batch
    const agg = await IngredientBatch.aggregate([
      { $match: {
          ingredient: new mongoose.Types.ObjectId(ingredientId),
          isActive: true,
          remainingQuantity: { $gt: 0 }
      }},
      { $group: {
          _id: '$ingredient',
          totalRemaining: { $sum: '$remainingQuantity' }
      }}
    ]);
  
    const totalStock = agg[0]?.totalRemaining || 0;
  
    // 2. Lấy batch mới nhất
    const latest = await IngredientBatch.findOne({
      ingredient: new mongoose.Types.ObjectId(ingredientId),
      isActive: true
    })
    .sort({ receivedDate: -1 })
    .lean();
  
    // 3. Cập nhật cache trên Ingredient
    const update = { stock: totalStock };
    if (latest) {
      update.costPrice = latest.costPrice;
      update.supplier  = latest.supplier;
    }
  
    await Ingredient.updateOne(
      { _id: new mongoose.Types.ObjectId(ingredientId) },
      { $set: update }
    );
  }
  
  export { consumeIngredientWithCOGS, syncIngredientCache };