import ProductStock from './model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'

export const getProductStockLists = async (req, res) => {
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
      ...lookupRef('product', 'MenuItems'),
      ...lookupRef('warehouse', 'Warehouses'),
      ...lookupUser('updatedBy')
    ]

    // Search
    if (searchValue) {
      const isNumeric = !isNaN(searchValue)
      const orConditions = [
        { 'product.name': { $regex: searchValue, $options: 'i' } },
        { 'ingredient.unit': { $regex: searchValue, $options: 'i' } },
        { 'warehouse.name': { $regex: searchValue, $options: 'i' } }
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
    const countResult = await ProductStock.aggregate(countPipeline)
    const recordsFiltered = countResult.length > 0 ? countResult[0].count : 0

    // Project dữ liệu
    pipeline.push(
      { $sort: { [sortField]: sortDir } },
      { $skip: start },
      { $limit: length },
      {
        $project: {
          _id: 1,
          quantity: 1,
          product: {
            name: '$product.name'
          },
          warehouse: {
            name: '$warehouse.name',
            location: '$warehouse.location'
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    )

    // Lấy dữ liệu và tổng bản ghi
    const data = await ProductStock.aggregate(pipeline)
    const recordsTotal = await ProductStock.countDocuments({
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
