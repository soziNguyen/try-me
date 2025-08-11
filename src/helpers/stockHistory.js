// Helper function để tự động tạo StockHistory
const createStockHistory = async (documentData, documentType, documentId) => {
  try {
    const historyData = {
      documentCode: documentData.documentCode,
      documentType: documentType, // 'StockReceipt', 'StockIssue', 'StockTransfer'
      documentId: documentId,
      transactionType: documentData.transactionType, // 'RECEIPT', 'ISSUE', 'TRANSFER'
      transactionDate: documentData.transactionDate || new Date(),
      warehouse: documentData.warehouse || documentData.warehouseFrom,
      warehouseTo: documentData.warehouseTo, // Chỉ có cho StockTransfer
      totalQuantity: documentData.totalQuantity,
      totalValue: documentData.totalValue,
      status: documentData.status,
      reason: documentData.reason,
      note: documentData.note,
      createdBy: documentData.createdBy
    }

    const stockHistory = new StockHistory(historyData)
    await stockHistory.save()
    
    return stockHistory
  } catch (error) {
    console.error('Error creating stock history:', error)
    throw error
  }
}

// Ví dụ sử dụng trong controller tạo phiếu nhập
export const createStockReceipt = async (req, res) => {
  try {
    // Tạo phiếu nhập
    const stockReceipt = new StockReceipt(req.body)
    await stockReceipt.save()
    
    // Tự động tạo lịch sử
    await createStockHistory(stockReceipt, 'StockReceipt', stockReceipt._id)
    
    responseHelper.success(res, stockReceipt, 'Tạo phiếu nhập thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// Ví dụ sử dụng trong controller tạo phiếu xuất
export const createStockIssue = async (req, res) => {
  try {
    // Tạo phiếu xuất
    const stockIssue = new StockIssue(req.body)
    await stockIssue.save()
    
    // Tự động tạo lịch sử
    await createStockHistory(stockIssue, 'StockIssue', stockIssue._id)
    
    responseHelper.success(res, stockIssue, 'Tạo phiếu xuất thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// Ví dụ sử dụng trong controller tạo phiếu chuyển kho
export const createStockTransfer = async (req, res) => {
  try {
    // Tạo phiếu chuyển kho
    const stockTransfer = new StockTransfer(req.body)
    await stockTransfer.save()
    
    // Tự động tạo lịch sử
    await createStockHistory(stockTransfer, 'StockTransfer', stockTransfer._id)
    
    responseHelper.success(res, stockTransfer, 'Tạo phiếu chuyển kho thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}