import StockMovement from "../models/stockMovement.js";
import responseHelper from "../helpers/responseHelper.js";


// GET - lấy danh sách stock movements
export const getStockMovements = async (req, res) => {
  try {
    const draw = parseInt(req.query.draw) || 0;
    const start = parseInt(req.query.start) || 0;
    const length = parseInt(req.query.length) || 10;
    const searchValue = (req.query['search[value]'] || '').trim();
    const sortColumnIndex = req.query['order[0][column]'];
    const sortField = req.query[`columns[${sortColumnIndex}][data]`] || 'date';
    const sortOrder = req.query['order[0][dir]'] === 'asc' ? 1 : -1;

    const searchFields = ['note', 'type'];
    const baseCondition = {};
    const searchCondition = searchValue
      ? {
          ...baseCondition,
          $or: searchFields.map(f => ({
            [f]: { $regex: searchValue, $options: 'i' }
          }))
        }
      : baseCondition;

    const total = await StockMovement.countDocuments(baseCondition);
    const filtered = await StockMovement.countDocuments(searchCondition);

    const data = await StockMovement.find(searchCondition)
      .skip(start)
      .limit(length)
      .sort({ [sortField]: sortOrder })
      .populate('ingredient', 'name')
      .populate('fromWarehouse', 'name')
      .populate('toWarehouse', 'name')
      .populate('reference')
      .lean();

    responseHelper.success(res, {
      draw,
      recordsTotal: total,
      recordsFiltered: filtered,
      data
    });
  } catch (err) {
    responseHelper.error(res, err.message);
  }
};