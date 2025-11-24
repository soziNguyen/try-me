import ProductStock from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import mongoose from 'mongoose'
export const getProductStockLists = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1
    const warehouse = req.query.warehouse
    const startDate = req.query.startDate
    const endDate = req.query.endDate

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = {
      organization: organizationId
    }

    if (warehouse && warehouse !== 'all') {
      matchCondition.warehouse = new mongoose.Types.ObjectId(String(warehouse))
    }

    if (startDate || endDate) {
      matchCondition.updatedAt = {}
      if (startDate) {
        matchCondition.updatedAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const endOfDay = new Date(endDate)
        endOfDay.setHours(23, 59, 59, 999)
        matchCondition.updatedAt.$lte = endOfDay
      }
    }

    // Pipeline
    const pipeline = [
      { $match: matchCondition },
      ...lookupRef('product', 'MenuItems'),
      ...lookupRef('combo', 'Combos'),
      ...lookupRef('warehouse', 'Warehouses'),
      ...lookupUser('updatedBy')
    ]

    // Thêm field item
    pipeline.push({
      $addFields: {
        item: {
          $cond: {
            if: { $ifNull: ['$product', false] },
            then: {
              _id: '$product._id',
              name: '$product.name',
              sku: '$product.sku',
              price: '$product.price',
              type: 'product'
            },
            else: {
              $cond: {
                if: { $ifNull: ['$combo', false] },
                then: {
                  _id: '$combo._id',
                  name: '$combo.name',
                  sku: '$combo.sku',
                  price: '$combo.price',
                  type: 'combo'
                },
                else: null
              }
            }
          }
        }
      }
    })

    // Search
    if (searchValue) {
      const isNumeric = !isNaN(searchValue)
      const orConditions = [
        { 'item.name': { $regex: searchValue, $options: 'i' } },
        { 'item.sku': { $regex: searchValue, $options: 'i' } },
        { 'warehouse.name': { $regex: searchValue, $options: 'i' } },
        { 'warehouse.code': { $regex: searchValue, $options: 'i' } }
      ]

      if (isNumeric) {
        orConditions.push({ quantity: Number(searchValue) })
      }

      pipeline.push({
        $match: { $or: orConditions }
      })
    }

    // Đếm bản ghi sau lọc
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await ProductStock.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'item.name':
      case 'item':
        sortObj['item.name'] = sortDir
        break
      case 'warehouse.name':
      case 'warehouse':
        sortObj['warehouse.name'] = sortDir
        break
      case 'quantity':
        sortObj['quantity'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Tính tổng tồn kho trước khi phân trang
    const totalQuantityPipeline = [...pipeline]
    totalQuantityPipeline.push({
      $group: {
        _id: null,
        totalQuantity: { $sum: '$quantity' }
      }
    })

    const totalQuantityResult = await ProductStock.aggregate(totalQuantityPipeline)
    const totalQuantity = totalQuantityResult.length > 0 ? totalQuantityResult[0].totalQuantity : 0

    // Project dữ liệu + phân trang
    pipeline.push(
      { $sort: sortObj },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          quantity: 1,
          item: 1,
          warehouse: {
            _id: '$warehouse._id',
            name: '$warehouse.name',
            code: '$warehouse.code',
            location: '$warehouse.location'
          },
          updatedBy: {
            _id: '$updatedBy._id',
            username: '$updatedBy.username'
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    )

    // Lấy dữ liệu
    const data = await ProductStock.aggregate(pipeline)
    const recordsTotal = await ProductStock.countDocuments({
      organization: organizationId
    })

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      totalQuantity,
      data
    })
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}
