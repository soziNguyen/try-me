import StockHistory from '../models/stockHistory.js'
import StockEntry from '../models/stockEntry.js'
import StockIssue from '../models/stockIssue.js'
import StockTransfer from '../models/stockTransfer.js'
import responseHelper from '../helpers/responseHelper.js'

// GET ALL HISTORY - Danh sách các phiếu
export const getStockHistory = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query["search[value]"] || "").trim()
    const colIdx = req.query["order[0][column]"]
    const sortField = req.query[`columns[${colIdx}][data]`] || "createdAt"
    const sortDir = req.query["order[0][dir]"] === "asc" ? 1 : -1

    // Filters
    const { 
      transactionType,
      warehouse,
      dateFrom, 
      dateTo 
    } = req.query

    const pipeline = [
      // Lookup warehouse
      {
        $lookup: {
          from: 'Warehouses',
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
      
      // Lookup warehouseTo (cho transfer)
      {
        $lookup: {
          from: 'Warehouses',
          localField: 'warehouseTo',
          foreignField: '_id',
          as: 'warehouseTo'
        }
      },
      { $unwind: { path: '$warehouseTo', preserveNullAndEmptyArrays: true } },
      
      // Lookup user
      {
        $lookup: {
          from: 'Users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy'
        }
      },
      { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
    ]

    // Apply filters
    const matchConditions = {}
    
    if (transactionType) matchConditions.transactionType = transactionType
    if (warehouse) matchConditions['warehouse._id'] = mongoose.Types.ObjectId(warehouse)
    
    if (dateFrom || dateTo) {
      matchConditions.transactionDate = {}
      if (dateFrom) matchConditions.transactionDate.$gte = new Date(dateFrom)
      if (dateTo) matchConditions.transactionDate.$lte = new Date(dateTo)
    }

    // Search
    if (searchValue) {
      matchConditions.$or = [
        { documentCode: { $regex: searchValue, $options: "i" } },
        { reason: { $regex: searchValue, $options: "i" } },
        { note: { $regex: searchValue, $options: "i" } },
        { "warehouse.name": { $regex: searchValue, $options: "i" } },
        { "warehouseTo.name": { $regex: searchValue, $options: "i" } },
        { "createdBy.name": { $regex: searchValue, $options: "i" } }
      ]
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions })
    }

    // Count total filtered records
    const countPipeline = [...pipeline, { $count: "count" }]
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
      case 'warehouse.name':
        sortObj['warehouse.name'] = sortDir
        break
      case 'totalQuantity':
        sortObj['totalQuantity'] = sortDir
        break
      case 'transactionDate':
        sortObj['transactionDate'] = sortDir
        break
      case 'status':
        sortObj['status'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    pipeline.push({ $sort: sortObj })
    pipeline.push({ $skip: start })
    pipeline.push({ $limit: length })

    const data = await StockHistory.aggregate(pipeline)
    const recordsTotal = await StockHistory.countDocuments()

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

// GET CHI TIẾT PHIẾU TỪ HISTORY
export const getTransactionDetail = async (req, res) => {
  try {
    const { historyId } = req.params
    
    // Lấy thông tin history
    const history = await StockHistory.findById(historyId)
      .populate('warehouse', 'name location')
      .populate('warehouseTo', 'name location')
      .populate('createdBy', 'name username')
      .lean()
    
    if (!history) {
      return responseHelper.error(res, 'Không tìm thấy lịch sử giao dịch', 404)
    }
    
    // Lấy chi tiết phiếu gốc dựa trên documentType
    let documentDetail = null
    
    switch (history.documentType) {
      case 'StockEntry':
        documentDetail = await StockEntry.findById(history.documentId)
          .populate('supplier', 'name contact')
          .populate('items.ingredient', 'name unit')
          .lean()
        break
        
      case 'StockIssue':
        documentDetail = await StockIssue.findById(history.documentId)
          .populate('items.ingredient', 'name unit')
          .lean()
        break
        
      case 'StockTransfer':
        documentDetail = await StockTransfer.findById(history.documentId)
          .populate('warehouseFrom', 'name location')
          .populate('warehouseTo', 'name location')
          .populate('items.ingredient', 'name unit')
          .lean()
        break
    }
    
    if (!documentDetail) {
      return responseHelper.error(res, 'Không tìm thấy chi tiết phiếu gốc', 404)
    }
    
    const result = {
      history,
      document: documentDetail
    }
    
    responseHelper.success(res, result, 'Lấy chi tiết giao dịch thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}