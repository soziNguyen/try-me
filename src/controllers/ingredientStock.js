import IngredientStock from '../models/ingredientStock.js'
import responseHelper from '../helpers/responseHelper.js'
import { lookupRef } from '../helpers/lookupHelper.js'

export const getIngredientStockList = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query["search[value]"] || "").trim()
    const colIdx = req.query["order[0][column]"]
    const sortField = req.query[`columns[${colIdx}][data]`] || "updatedAt"
    const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

    // Khởi tạo pipeline
    const pipeline = [
      ...lookupRef('ingredient', 'Ingredients'),
      ...lookupRef('warehouse', 'Warehouses'),
      ...lookupRef('supplier', 'Suppliers')
    ]

    // Search
    if (searchValue) {
      const isNumeric = !isNaN(searchValue);
      const orConditions = [
        { "ingredient.name": { $regex: searchValue, $options: "i" } },
        { "warehouse.name": { $regex: searchValue, $options: "i" } },
        { "supplier.name": { $regex: searchValue, $options: "i" } }
      ];
    
      if (isNumeric) {
        orConditions.push({ quantity: Number(searchValue) });
      }
    
      pipeline.push({
        $match: { $or: orConditions }
      });
    }

    // Đếm bản ghi sau lọc (recordsFiltered)
    const countPipeline = [...pipeline, { $count: "count" }]
    const countResult = await IngredientStock.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'ingredient.name':
      case 'ingredient':
        sortObj['ingredient.name'] = sortDir
        break
      case 'warehouse.name':
      case 'warehouse':
        sortObj['warehouse.name'] = sortDir
        break
      case 'supplier.name':
      case 'supplier':
        sortObj['suppliers.name'] = sortDir
        break
      case 'quantity':
        sortObj['quantity'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }
    pipeline.push({ $sort: sortObj })

    // Pagination
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    // Project dữ liệu
    pipeline.push({
      $project: {
        _id: 1,
        quantity: 1,
        ingredient: {
          name: "$ingredient.name",
          unit: "$ingredient.unit"
        },
        warehouse: {
          name: "$warehouse.name"
        },
        supplier: {
          name: "$supplier.name"
        }
      }
    })

    // Lấy dữ liệu và tổng bản ghi
    const data = await IngredientStock.aggregate(pipeline)
    const recordsTotal = await IngredientStock.countDocuments()

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

export const getIngredientTotalStock = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new Error('ID nguyên liệu không hợp lệ');
    }

    const result = await IngredientStock.aggregate([
      {
        $match: {
          ingredient: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $group: {
          _id: '$ingredient',
          totalStock: { $sum: '$quantity' }
        }
      }
    ]);

    const totalStock = result[0]?.totalStock || 0;

    responseHelper.success(res, { ingredient: id, totalStock });
  } catch (err) {
    responseHelper.error(res, err.message);
  }
};