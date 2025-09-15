import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import responseHelper from '../../../helpers/responseHelper.js'
import StockHistory from './model.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'

export const getStockHistories = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'transactionDate'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const pipeline = [
      { $match: { organization: organizationId } },
      {
        $lookup: {
          from: 'Ingredients',
          localField: 'items.ingredient',
          foreignField: '_id',
          as: 'ingredientDetails'
        }
      },
      ...lookupUser('createdBy'),
      ...lookupRef('fromWarehouse', 'warehouses'),
      ...lookupRef('toWarehouse', 'warehouses'),
      ...lookupRef('supplier', 'suppliers'),
      {
        $addFields: {
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                ingredient: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$ingredientDetails',
                        cond: { $eq: ['$$this._id', '$$item.ingredient'] }
                      }
                    },
                    0
                  ]
                },
                quantity: '$$item.quantity',
                quantityBefore: '$$item.quantityBefore',
                quantityAfter: '$$item.quantityAfter'
              }
            }
          }
        }
      },
      // Tính tổng số lượng cho
      {
        $addFields: {
          totalQuantity: {
            $sum: '$items.quantity'
          }
        }
      }
    ]

    // Search filter
    if (searchValue) {
      pipeline.push({
        $match: {
          $or: [
            { documentCode: { $regex: searchValue, $options: 'i' } },
            { 'items.ingredient.name': { $regex: searchValue, $options: 'i' } },
            { 'createdBy.username': { $regex: searchValue, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $dateToString: {
                      format: '%d/%m/%Y',
                      date: '$transactionDate'
                    }
                  },
                  regex: searchValue,
                  options: 'i'
                }
              }
            },
            // Search theo tổng số lượng
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$totalQuantity' },
                  regex: searchValue,
                  options: 'i'
                }
              }
            }
          ]
        }
      })
    }

    // Count after filter
    const countPipeline = [...pipeline, { $count: 'count' }]
    const countResult = await StockHistory.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'documentCode':
        sortObj['documentCode'] = sortDir
        break
      case 'transactionType':
        sortObj['transactionType'] = sortDir
        break
      case 'createdBy.username':
        sortObj['createdBy.username'] = sortDir
        break
      case 'totalQuantity': // sort theo tổng số lượng
        sortObj['totalQuantity'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }
    pipeline.push({ $sort: sortObj })

    // Pagination
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        documentId: 1,
        documentCode: 1,
        transactionType: 1,
        transactionDate: 1,
        items: 1,
        totalQuantity: 1,
        fromWarehouse: 1,
        toWarehouse: 1,
        supplier: 1,
        createdBy: 1,
        reason: 1,
        note: 1
      }
    })

    const data = await StockHistory.aggregate(pipeline)
    const recordsTotal = await StockHistory.countDocuments({
      organization: organizationId
    })

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    })
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}
