import mongoose from 'mongoose'
import { StockEntry, units } from './model.js'
import IngredientStock from '../../inventory/ingredient-stock/model.js'
import { Ingredient } from '../../inventory/ingredient/model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import withTransaction from '../../../helpers/withTransaction.js'
import { generateDocumentCode } from '../../../helpers/common.js'
import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import StockHistory from '../stock-history/model.js'
import Organization from '../../organization/model.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import BusinessError from '../../error/BusinessError.js'

// GET ALL
export const getAllStockEntries = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = { organization: organizationId }

    // Warehouse filtering
    if (req.warehouseFilter) {
      // Staff - kho được gán
      matchCondition.warehouse = req.warehouseFilter
    } else {
      // Admin/Org - kiểm tra defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
      // null -> xem tất cả
    }

    const entries = await StockEntry.aggregate([
      { $match: matchCondition },
      ...lookupRef('supplier', 'Suppliers'),
      ...lookupRef('warehouse', 'Warehouses'),
      { $sort: { createdAt: -1 } },
      { $project: { _id: 1, code: 1, 'supplier.name': 1, 'warehouse.name': 1 } }
    ])
    responseHelper.success(res, entries)
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// DATATABLE SERVER-SIDE
export const getStockEntries = async (req, res) => {
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

    const matchCondition = { organization: organizationId }

    // Warehouse filtering
    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
      // null -> xem tất cả
    }

    const basePipeline = [
      { $match: matchCondition },
      ...lookupRef('supplier', 'Suppliers'),
      ...lookupRef('warehouse', 'Warehouses'),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.ingredient', 'Ingredients', { as: 'ingredient' }),
      ...lookupUser('createdBy')
    ]

    // Search before grouping
    if (searchValue) {
      basePipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: 'i' } },
            { note: { $regex: searchValue, $options: 'i' } },
            { 'supplier.name': { $regex: searchValue, $options: 'i' } },
            { 'warehouse.name': { $regex: searchValue, $options: 'i' } },
            { 'ingredient.name': { $regex: searchValue, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$items.quantity' },
                  regex: searchValue
                }
              }
            },
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $dateToString: { format: '%d/%m/%Y', date: '$date' }
                  },
                  regex: searchValue,
                  options: 'i'
                }
              }
            }
          ]
        }
      })
    }

    // Add fields + Group
    basePipeline.push(
      {
        $addFields: {
          'items.ingredient': {
            _id: '$ingredient._id',
            name: '$ingredient.name'
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          code: { $first: '$code' },
          note: { $first: '$note' },
          date: { $first: '$date' },
          supplier: {
            $first: {
              _id: '$supplier._id',
              code: '$supplier.code',
              name: '$supplier.name'
            }
          },
          warehouse: {
            $first: {
              _id: '$warehouse._id',
              name: '$warehouse.name',
              location: '$warehouse.location'
            }
          },
          createdAt: { $first: '$createdAt' },
          createdBy: { $first: '$createdBy.username' },
          items: { $push: '$items' },
          isLocked: { $first: '$isLocked' },
          lockedAt: { $first: '$lockedAt' },
          lockedBy: { $first: '$lockedBy' },
          subTotal: { $first: '$subTotal' },
          taxRate: { $first: '$taxRate' },
          taxAmount: { $first: '$taxAmount' },
          grandTotal: { $first: '$grandTotal' }
        }
      }
    )

    // Count pipeline (KHÔNG sort/pagination)
    const countPipeline = [...basePipeline, { $count: 'count' }]
    const countResult = await StockEntry.aggregate(countPipeline)
    const recordsFiltered = countResult[0]?.count || 0

    // Sort
    const sortObj = {}
    switch (sortField) {
      case 'supplier.name':
      case 'supplier':
        sortObj['supplier.name'] = sortDir
        break
      case 'warehouse.name':
      case 'warehouse':
        sortObj['warehouse.name'] = sortDir
        break
      case 'code':
        sortObj['code'] = sortDir
        break
      case 'note':
        sortObj['note'] = sortDir
        break
      case 'date':
        sortObj['date'] = sortDir
        break
      default:
        sortObj[sortField] = sortDir
    }

    // Final pipeline with sort + pagination
    const dataPipeline = [...basePipeline, { $sort: sortObj }, { $skip: start }, { $limit: length }]

    const data = await StockEntry.aggregate(dataPipeline)
    const recordsTotal = await StockEntry.countDocuments({
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

// Get Stock Entry by ID (Detail)
export const getStockEntryById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const matchCondition = {
      _id: id,
      organization: organizationId
    }

    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    } else {
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        matchCondition.warehouse = org.defaultWarehouse
      }
    }

    const stockEntry = await StockEntry.findOne(matchCondition)
      .populate('supplier', 'name')
      .populate('warehouse', 'name location')
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .populate('lockedBy', 'username')
      .populate('items.ingredient', 'name unit')
      .lean()

    if (!stockEntry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }

    responseHelper.success(res, { stockEntry, units }, 'Lấy thông tin phiếu nhập thành công')
  } catch (err) {
    responseHelper.error(res, err.message)
  }
}

// CREATE
export const createStockEntry = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const entry = await withTransaction(async (session) => {
      const code = await generateDocumentCode(StockEntry, 'SE')
      const date = new Date()

      const docData = {
        code: code,
        date: date,
        createdBy: req.user._id,
        organization: organizationId
      }

      // Warehouse logic
      if (req.warehouseFilter) {
        // Staff - bắt buộc dùng kho được gán
        docData.warehouse = req.warehouseFilter
      } else {
        // Admin/Org - dùng defaultWarehouse
        const org = await Organization.findById(organizationId).select('defaultWarehouse')
        if (!org?.defaultWarehouse) {
          throw new BusinessError(
            'Tổ chức chưa thiết lập kho mặc định. Vui lòng cập nhật trong profile.',
            400
          )
        }
        docData.warehouse = org.defaultWarehouse
      }

      const doc = new StockEntry(docData)
      await doc.save({ session })
      return doc
    })

    responseHelper.success(
      res,
      { id: entry._id, code: entry.code },
      'Khởi tạo phiếu nhập thành công'
    )
  } catch (err) {
    if (err instanceof BusinessError) {
      return responseHelper.error(res, err.message, err.statusCode)
    }
    responseHelper.error(res, err.message)
  }
}

// UPDATE (form)
// UPDATE với Delta-based Logic
export const updateStockEntryFromForm = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new BusinessError('ID không hợp lệ', 400)
      }

      // Match condition với warehouse filter
      const matchCondition = {
        _id: id,
        organization: organizationId
      }

      if (req.warehouseFilter) {
        matchCondition.warehouse = req.warehouseFilter
      }

      // Lấy phiếu nhập cũ
      const oldEntry = await StockEntry.findOne(matchCondition).session(session)

      if (!oldEntry)
        throw new BusinessError('Phiếu nhập không tồn tại hoặc không có quyền truy cập', 404)
      if (oldEntry.isLocked)
        throw new BusinessError('Phiếu nhập đã bị khóa, không thể chỉnh sửa', 400)

      // Lấy dữ liệu mới từ form
      const { supplier, warehouse, note, items: rawItems = [] } = req.body

      // Validation: Staff không được đổi warehouse
      if (req.warehouseFilter && warehouse) {
        if (warehouse.toString() !== req.warehouseFilter.toString()) {
          throw new BusinessError('Bạn không có quyền chuyển phiếu nhập sang kho khác', 403)
        }
      }

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new BusinessError('Phiếu nhập phải có ít nhất 1 nguyên liệu', 400)
      }

      if (!warehouse) throw new BusinessError('Vui lòng chọn kho', 400)
      if (!mongoose.isValidObjectId(warehouse)) throw new BusinessError('ID kho không hợp lệ', 400)

      // Validate và parse items mới
      let subTotal = 0
      const items = []

      for (const item of rawItems) {
        if (!mongoose.isValidObjectId(item.ingredient)) {
          throw new BusinessError('ID nguyên liệu không hợp lệ', 400)
        }

        const quantity = parseFloat(item.quantity) || 0
        if (quantity <= 0) throw new BusinessError('Số lượng phải lớn hơn 0', 400)

        const unitPrice = parseFloat(item.unitPrice) || 0
        if (unitPrice < 0) throw new BusinessError('Đơn giá không được âm', 400)

        const itemTotal = quantity * unitPrice
        subTotal += itemTotal

        items.push({
          ingredient: item.ingredient,
          quantity,
          unit: item.unit || null,
          unitPrice,
          total: itemTotal
        })
      }

      // ===== LOGIC DELTA: Tính thay đổi thực tế =====
      const deltaMap = new Map() // ingredient -> {old, new, delta}

      // Ghi nhận số lượng cũ
      for (const oldItem of oldEntry.items) {
        if (oldItem.ingredient) {
          const ingId = oldItem.ingredient.toString()
          deltaMap.set(ingId, {
            old: oldItem.quantity,
            new: 0,
            delta: -oldItem.quantity
          })
        }
      }

      // Ghi nhận số lượng mới và tính delta
      for (const newItem of items) {
        const ingId = newItem.ingredient.toString()
        const existing = deltaMap.get(ingId)
        if (existing) {
          existing.new = newItem.quantity
          existing.delta = newItem.quantity - existing.old
        } else {
          deltaMap.set(ingId, {
            old: 0,
            new: newItem.quantity,
            delta: newItem.quantity
          })
        }
      }

      // CHECK TỒN KHO dựa trên delta
      for (const [ingId, { delta }] of deltaMap) {
        if (delta < 0) {
          // Cần GIẢM tồn kho (delta âm)
          const currentStock = await IngredientStock.findOne({
            ingredient: ingId,
            warehouse: warehouse,
            organization: organizationId
          }).session(session)

          const currentQty = currentStock?.quantity || 0
          const decreaseAmount = Math.abs(delta)

          if (currentQty < decreaseAmount) {
            throw new BusinessError(
              `Không thể giảm số lượng. Tồn kho hiện tại không đủ để thực hiện thay đổi.`,
              400
            )
          }
        }
      }

      // CẬP NHẬT TỒN KHO theo delta
      for (const [ingId, { delta }] of deltaMap) {
        if (delta !== 0) {
          await IngredientStock.updateOne(
            {
              ingredient: ingId,
              warehouse: warehouse,
              organization: organizationId
            },
            {
              $inc: { quantity: delta },
              $set: { supplier: supplier }
            },
            { upsert: true, session }
          )
        }
      }

      const taxRate = oldEntry.taxRate || 0.08
      const taxAmount = subTotal * taxRate
      const grandTotal = subTotal + taxAmount

      const updateData = {
        supplier,
        warehouse,
        note,
        items,
        subTotal,
        taxRate,
        taxAmount,
        grandTotal,
        updatedBy: req.user._id
      }

      // Cập nhật phiếu nhập
      const newEntry = await StockEntry.findOneAndUpdate(matchCondition, updateData, {
        new: true,
        session
      })

      if (!newEntry) throw new BusinessError('Cập nhật thất bại', 400)

      // Cập nhật tổng tồn kho trong Ingredient
      const affectedIngredientIds = [...deltaMap.keys()]
      for (const ingId of affectedIngredientIds) {
        const totalStockAgg = await IngredientStock.aggregate([
          {
            $match: {
              ingredient: new mongoose.Types.ObjectId(ingId),
              organization: organizationId
            }
          },
          { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
        ]).session(session)

        const totalStock = totalStockAgg[0]?.totalQuantity || 0

        await Ingredient.updateOne(
          { _id: ingId, organization: organizationId },
          { $set: { stock: totalStock } },
          { session }
        )
      }

      // Populate tham chiếu
      await newEntry.populate([
        { path: 'supplier', select: 'name' },
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy updatedBy lockedBy', select: 'username' },
        { path: 'items.ingredient', select: 'name unit' }
      ])

      return newEntry
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu nhập thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode)
    } else {
      return responseHelper.error(res, 'Lỗi server nội bộ', 500)
    }
  }
}

// DELETE
export const deleteStockEntries = async (req, res) => {
  try {
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BusinessError('Không có phiếu nào được chọn để xóa', 400)
      }

      const organizationId = getCurrentOrg(req)
      if (!organizationId) throw new BusinessError('Thiếu thông tin tổ chức', 400)

      // Match condition với warehouse filter
      const matchCondition = {
        _id: { $in: ids },
        organization: organizationId
      }

      if (req.warehouseFilter) {
        matchCondition.warehouse = req.warehouseFilter
      }

      const entries = await StockEntry.find(matchCondition).session(session)

      if (!entries.length) {
        throw new BusinessError('Không tìm thấy phiếu nhập hoặc không có quyền truy cập', 404)
      }

      const lockedEntries = entries.filter((e) => e.isLocked)
      if (lockedEntries.length > 0) {
        throw new BusinessError('Không thể xóa phiếu đã bị khóa', 400)
      }

      // CHECK TỒN KHO trước khi xóa
      for (const entry of entries) {
        if (entry.warehouse) {
          for (const item of entry.items) {
            if (item.ingredient && item.quantity > 0) {
              const currentStock = await IngredientStock.findOne({
                ingredient: item.ingredient,
                warehouse: entry.warehouse,
                organization: organizationId
              }).session(session)

              if (currentStock && currentStock.quantity < item.quantity) {
                throw new BusinessError(
                  'Không thể xóa phiếu. Tồn kho nguyên liệu hiện tại không đủ để hoàn nguyên.',
                  400
                )
              }
            }
          }
        }
      }

      // Trừ tồn kho từ IngredientStock
      for (const entry of entries) {
        if (entry.warehouse) {
          for (const item of entry.items) {
            if (item.ingredient && item.quantity > 0) {
              await IngredientStock.updateOne(
                {
                  ingredient: item.ingredient,
                  warehouse: entry.warehouse,
                  organization: organizationId
                },
                { $inc: { quantity: -item.quantity } },
                { session }
              )
            }
          }
        }
      }

      // Cập nhật tổng tồn kho trong Ingredient
      const updatedIngredientIds = [
        ...new Set(
          entries.flatMap((entry) => entry.items.map((item) => item.ingredient.toString()))
        )
      ]

      for (const ingId of updatedIngredientIds) {
        const totalStockAgg = await IngredientStock.aggregate([
          {
            $match: {
              ingredient: new mongoose.Types.ObjectId(ingId),
              organization: organizationId
            }
          },
          { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
        ]).session(session)

        const totalStock = totalStockAgg[0]?.totalQuantity || 0

        await Ingredient.updateOne(
          { _id: ingId, organization: organizationId },
          { $set: { stock: totalStock } },
          { session }
        )
      }

      // Xóa phiếu
      await StockEntry.deleteMany(matchCondition).session(session)
    })

    responseHelper.success(res, null, 'Xóa và cập nhật tồn kho thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode || 400)
    }
    console.error(error)
    return responseHelper.error(res, error.message, 500)
  }
}

// LOCK Stock Entry
export const lockStockEntry = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const entry = await StockEntry.findOne({
      _id: id,
      organization: organizationId
    })
    if (!entry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }

    if (entry.isLocked) {
      return responseHelper.error(res, 'Phiếu nhập đã được khóa trước đó', 400)
    }

    if (!entry.items || entry.items.length === 0) {
      return responseHelper.error(res, 'Phiếu nhập không có sản phẩm nào', 400)
    }

    // Validate items (với cast an toàn)
    for (const item of entry.items) {
      if (!item.ingredient) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin ingredient', 400)
      }
      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return responseHelper.error(res, 'Có sản phẩm với số lượng không hợp lệ', 400)
      }
    }

    await withTransaction(async (session) => {
      // update lock state
      const updatedEntry = await StockEntry.findOneAndUpdate(
        {
          _id: id,
          organization: organizationId,
          isLocked: false // chỉ cập nhật nếu chưa khóa
        },
        {
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: req.user._id
        },
        { new: true, session }
      ).populate('lockedBy', 'username')

      if (!updatedEntry) {
        throw new BusinessError('Không thể cập nhật phiếu nhập', 400)
      }

      // chuẩn bị summary và itemsSummary (giữ tối thiểu per-item)
      const warehouseId = entry.warehouse?._id || entry.warehouse
      const supplierId = entry.supplier?._id || entry.supplier

      const totalItems = entry.items.length
      const totalQuantity = entry.items.reduce((sum, item) => {
        return sum + (Number(item.quantity) || 0)
      }, 0)

      const itemsSummary = entry.items.map((item) => ({
        ingredient: item.ingredient._id || item.ingredient,
        quantity: Number(item.quantity) || 0
      }))

      // tạo stockHistory (dùng các trường tương thích: toWarehouse cho ENTRY)
      const stockHistory = {
        transactionType: 'ENTRY',
        documentType: 'StockEntry',
        documentId: entry._id,
        documentCode: entry.code || entry.documentCode || '',
        toWarehouse: warehouseId || null,
        fromWarehouse: null,
        supplier: supplierId || null,
        totalItems,
        totalQuantity,
        items: itemsSummary,
        reason: 'Stock entry locked',
        note: entry.note ? `${entry.note} (Locked)` : 'Stock entry locked',
        transactionDate: entry.date || new Date(),
        createdBy: req.user._id,
        updatedBy: null,
        organization: organizationId
      }

      await StockHistory.create([stockHistory], { session })
    })

    const finalEntry = await StockEntry.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('lockedBy', 'name username')
      .populate('items.ingredient', 'name sku unit stock')
      .populate('warehouse', 'name code')
      .populate('supplier', 'name code')

    responseHelper.success(res, finalEntry, 'Đã khóa phiếu nhập thành công')
  } catch (err) {
    responseHelper.error(res, err.message || 'Có lỗi xảy ra khi khóa phiếu nhập')
  }
}
