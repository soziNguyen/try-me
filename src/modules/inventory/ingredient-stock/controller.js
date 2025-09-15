import IngredientStock from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'

export const getIngredientStockList = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Khởi tạo pipeline với lookup
    const pipeline = [
      { $match: { organization: organizationId } },
      ...lookupRef('ingredient', 'Ingredients'),
      ...lookupRef('warehouse', 'Warehouses'),
      ...lookupRef('supplier', 'Suppliers')
    ]

    // Search
    if (searchValue) {
      const isNumeric = !isNaN(searchValue)
      const orConditions = [
        { 'ingredient.name': { $regex: searchValue, $options: 'i' } },
        { 'ingredient.unit': { $regex: searchValue, $options: 'i' } },
        { 'warehouse.name': { $regex: searchValue, $options: 'i' } },
        { 'supplier.name': { $regex: searchValue, $options: 'i' } }
      ]

      if (isNumeric) {
        orConditions.push({ quantity: Number(searchValue) })
      }

      pipeline.push({
        $match: { $or: orConditions }
      })
    }

    // Đếm bản ghi sau lọc (recordsFiltered)
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await IngredientStock.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

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
        sortObj['supplier.name'] = sortDir
        break
      case 'quantity':
        sortObj['quantity'] = sortDir
        break
      case 'unit':
      case 'ingredient.unit':
        sortObj['ingredient.unit'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Project dữ liệu
    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          quantity: 1,
          ingredient: {
            name: '$ingredient.name',
            unit: '$ingredient.unit'
          },
          warehouse: {
            name: '$warehouse.name',
            location: '$warehouse.location'
          },
          supplier: {
            name: '$supplier.name'
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    )
    // pipeline.push({ $match: { quantity: { $gt: 0 } } });

    // Lấy dữ liệu và tổng bản ghi
    const data = await IngredientStock.aggregate(pipeline)
    const recordsTotal = await IngredientStock.countDocuments({
      organization: organizationId
    })

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
