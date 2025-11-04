import IngredientStock from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupRef } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import mongoose from 'mongoose'

export const getIngredientStockList = async (req, res) => {
  try {
    const draw = +req.body.draw || 0
    const start = +req.body.start || 0
    const length = +req.body.length || 10
    const searchValue = (req.body['search[value]'] || '').trim()
    let sortField = 'createdAt'
    let sortDir = -1

    if (req.body.order && req.body.order.length > 0) {
      const colIdx = req.body.order[0].column
      sortDir = req.body.order[0].dir === 'asc' ? 1 : -1
      sortField = req.body.columns?.[colIdx]?.data || 'createdAt'
    }
    const warehouse = req.body.warehouse || 'all'

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {
      organization: organizationId
    }

    if (warehouse !== 'all') {
      matchCondition.warehouse = new mongoose.Types.ObjectId(String(warehouse))
    }

    // Khởi tạo pipeline với lookup
    const pipeline = [
      { $match: matchCondition },
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
