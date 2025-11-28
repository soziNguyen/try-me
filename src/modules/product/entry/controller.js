import mongoose from 'mongoose'
import { ProductEntry, units } from './model.js'
import ProductStock from '../stock/model.js'
import responseHelper from '../../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import { generateDocumentCode } from '../../../helpers/common.js'
import withTransaction from '../../../helpers/withTransaction.js'
import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import BusinessError from '../../error/BusinessError.js'
import Organization from '../../organization/model.js'
import { getWarehouse } from '../../../helpers/warehouseHelper.js'
import { logActivity } from '../../activity-logs/service.js'
import { MenuItem } from '../../menu/menu-item/model.js'
import { Combo } from '../../menu/combo/model.js'
export const createProductEntry = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const warehouse = await getWarehouse(req, organizationId)

    const entry = await withTransaction(async (session) => {
      const code = await generateDocumentCode(ProductEntry, 'PE')
      const date = new Date()

      // Warehouse logic

      const docData = {
        code: code,
        date: date,
        createdBy: req.user._id,
        organization: organizationId,
        warehouse: warehouse
      }

      const doc = new ProductEntry(docData)
      await doc.save({ session })
      return doc
    })

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'CREATE',
      'PRODUCT_ENTRY',
      'Tạo phiếu nhập kho sản phẩm',
      entry.code,
      'SUCCESS',
      warehouse?._id
    )

    responseHelper.success(res, { id: entry._id, code: entry.code })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getProductEntryById = async (req, res) => {
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

    // Staff chỉ xem được phiếu của kho mình
    if (req.warehouseFilter) {
      matchCondition.warehouse = req.warehouseFilter
    }

    const productEntry = await ProductEntry.findOne(matchCondition)
      .populate('warehouse', 'name location')
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .populate('lockedBy', 'username')
      .populate('items.product', 'sku name')

    if (!productEntry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }
    responseHelper.success(res, { productEntry, units })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const getProductEntries = async (req, res) => {
  try {
    const draw = +req.query.draw || 0
    const start = +req.query.start || 0
    const length = +req.query.length || 10
    const searchValue = (req.query['search[value]'] || '').trim()
    const colIdx = req.query['order[0][column]']
    const sortField = req.query[`columns[${colIdx}][data]`] || 'createdAt'
    const sortDir = req.query['order[0][dir]'] === 'asc' ? 1 : -1
    const flatten = req.query.flatten === 'true'
    const warehouse = req.query.warehouse
    const startDate = req.query.startDate
    const endDate = req.query.endDate

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const matchCondition = { organization: organizationId }

    if (warehouse && warehouse !== 'all') {
      matchCondition.warehouse = new mongoose.Types.ObjectId(String(warehouse))
    } else if (warehouse === 'all') {
    } else {
      if (req.warehouseFilter) {
        matchCondition.warehouse = req.warehouseFilter
      } else {
        const org = await Organization.findById(organizationId).select('defaultWarehouse')
        if (org?.defaultWarehouse) {
          matchCondition.warehouse = org.defaultWarehouse
        }
      }
    }

    // Lọc theo ngày nhập
    if (startDate || endDate) {
      matchCondition.date = {}
      if (startDate) {
        matchCondition.date.$gte = new Date(startDate)
      }
      if (endDate) {
        const endOfDay = new Date(endDate)
        endOfDay.setHours(23, 59, 59, 999)
        matchCondition.date.$lte = endOfDay
      }
    }

    const basePipeline = [
      { $match: matchCondition },
      ...lookupRef('warehouse', 'Warehouses'),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'MenuItems',
          localField: 'items.product',
          foreignField: '_id',
          as: 'menuItemProduct'
        }
      },
      {
        $lookup: {
          from: 'Combos',
          localField: 'items.product',
          foreignField: '_id',
          as: 'comboProduct'
        }
      },
      {
        $addFields: {
          product: {
            $cond: {
              if: { $eq: ['$items.productType', 'MenuItem'] },
              then: { $arrayElemAt: ['$menuItemProduct', 0] },
              else: { $arrayElemAt: ['$comboProduct', 0] }
            }
          }
        }
      },
      ...lookupUser('createdBy')
    ]

    // Search
    if (searchValue) {
      basePipeline.push({
        $match: {
          $or: [
            { code: { $regex: searchValue, $options: 'i' } },
            { 'warehouse.name': { $regex: searchValue, $options: 'i' } },
            { note: { $regex: searchValue, $options: 'i' } },
            { 'product.name': { $regex: searchValue, $options: 'i' } },
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

    if (flatten) {
      // Group theo sản phẩm - gộp số lượng
      basePipeline.push({
        $group: {
          _id: '$product._id',
          product: { $first: '$product' },
          productType: { $first: '$items.productType' },
          quantity: { $sum: '$items.quantity' },
          unit: { $first: '$items.unit' },
          totalValue: { $sum: '$items.total' }
        }
      })

      // Lookup stock
      basePipeline.push({
        $lookup: {
          from: 'ProductStocks',
          let: {
            productId: '$_id',
            orgId: organizationId
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$organization', '$$orgId'] },
                    {
                      $or: [
                        { $eq: ['$product', '$$productId'] },
                        { $eq: ['$combo', '$$productId'] }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                totalStock: { $sum: '$quantity' }
              }
            }
          ],
          as: 'stockData'
        }
      })

      // Add field stock
      basePipeline.push({
        $addFields: {
          stock: {
            $ifNull: [{ $arrayElemAt: ['$stockData.totalStock', 0] }, 0]
          }
        }
      })

      // Project final
      basePipeline.push({
        $project: {
          _id: 0,
          productId: '$_id',
          product: 1,
          productType: 1,
          quantity: 1,
          unit: 1,
          totalValue: 1,
          stock: 1
        }
      })
    } else {
      basePipeline.push({
        $group: {
          _id: '$_id',
          code: { $first: '$code' },
          date: { $first: '$date' },
          warehouse: { $first: '$warehouse' },
          note: { $first: '$note' },
          total: { $first: '$total' },
          createdBy: { $first: '$createdBy.username' },
          isLocked: { $first: '$isLocked' },
          items: {
            $push: {
              $cond: {
                if: { $ifNull: ['$items', false] },
                then: {
                  productType: '$items.productType',
                  product: '$product',
                  quantity: '$items.quantity',
                  unit: '$items.unit',
                  unitPrice: '$items.unitPrice',
                  total: '$items.total'
                },
                else: '$$REMOVE'
              }
            }
          }
        }
      })
      basePipeline.push({
        $addFields: {
          totalQuantity: { $sum: '$items.quantity' }
        }
      })
    }

    // Sort - Map sort field để xử lý đúng
    const sortFieldMapping = {
      product: 'product.name',
      'product.name': 'product.name',
      quantity: 'quantity',
      stock: 'stock',
      entryDate: flatten ? 'entryDate' : 'date',
      date: flatten ? 'entryDate' : 'date',
      createdAt: flatten ? 'entryDate' : 'date'
    }

    const actualSortField = sortFieldMapping[sortField] || sortField
    basePipeline.push({ $sort: { [actualSortField]: sortDir } })

    // Count
    const countPipeline = [...basePipeline, { $count: 'totalCount' }]
    const totalData = await ProductEntry.aggregate(countPipeline)
    const recordsTotal = totalData.length > 0 ? totalData[0].totalCount : 0

    // Phân trang
    basePipeline.push({ $skip: start })
    basePipeline.push({ $limit: length })

    // Query
    const data = await ProductEntry.aggregate(basePipeline)

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered: recordsTotal,
      data
    })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateProductEntry = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const transactionResult = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new BusinessError('ID không hợp lệ', 400)
      }

      // Tìm phiếu cũ với warehouse filter nếu là Staff
      const findCondition = {
        _id: id,
        organization: organizationId
      }

      if (req.warehouseFilter) {
        findCondition.warehouse = req.warehouseFilter
      }

      const oldEntry = await ProductEntry.findOne(findCondition)
        .populate('items.product', 'name')
        .session(session)

      if (!oldEntry) throw new BusinessError('Phiếu nhập không tồn tại', 404)
      if (oldEntry.isLocked)
        throw new BusinessError('Phiếu nhập đã bị khóa, không thể chỉnh sửa', 400)

      // Warehouse không thay đổi - giữ nguyên từ phiếu cũ
      const warehouse = oldEntry.warehouse

      const { items: rawItems = [], note } = req.body

      // Validation đầu vào
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new BusinessError('Phiếu nhập phải có ít nhất 1 sản phẩm', 400)
      }

      // Validate và parse items
      let subTotal = 0
      const items = []

      for (const item of rawItems) {
        // Validate productType
        if (!item.productType || !['MenuItem', 'Combo'].includes(item.productType)) {
          throw new BusinessError('Loại sản phẩm không hợp lệ', 400)
        }

        if (!mongoose.isValidObjectId(item.product)) {
          throw new BusinessError('ID sản phẩm không hợp lệ', 400)
        }

        const quantity = parseInt(item.quantity) || 0
        if (quantity <= 0) {
          throw new BusinessError('Số lượng phải lớn hơn 0', 400)
        }

        const unitPrice = parseFloat(item.unitPrice) || 0
        if (unitPrice < 0) {
          throw new BusinessError('Đơn giá không được âm', 400)
        }

        const itemTotal = quantity * unitPrice
        subTotal += itemTotal

        items.push({
          productType: item.productType,
          product: item.product,
          quantity,
          unit: item.unit || null,
          unitPrice,
          total: itemTotal
        })
      }

      // Tính thay đổi thực tế
      const deltaMap = new Map() // key: productType:productId -> {old, new, delta, productType}

      // Ghi nhận số lượng cũ
      for (const oldItem of oldEntry.items) {
        if (oldItem.product) {
          const productId = oldItem.product._id
            ? oldItem.product._id.toString()
            : oldItem.product.toString()
          const key = `${oldItem.productType}:${productId}`
          deltaMap.set(key, {
            productType: oldItem.productType,
            productId: productId,
            name: oldItem.product.name || 'N/A',
            old: oldItem.quantity,
            oldUnit: oldItem.unit || '',
            oldUnitPrice: oldItem.unitPrice || 0,
            new: 0,
            newUnit: '',
            newUnitPrice: 0,
            delta: -oldItem.quantity
          })
        }
      }

      // Ghi nhận số lượng mới và tính delta
      for (const newItem of items) {
        const key = `${newItem.productType}:${newItem.product.toString()}`
        const existing = deltaMap.get(key)
        if (existing) {
          existing.new = newItem.quantity
          existing.newUnit = newItem.unit || ''
          existing.newUnitPrice = newItem.unitPrice || 0
          existing.delta = newItem.quantity - existing.old
        } else {
          let productDoc
          if (newItem.productType === 'Combo') {
            productDoc = await Combo.findById(newItem.product).select('name').session(session)
          } else {
            productDoc = await MenuItem.findById(newItem.product).select('name').session(session)
          }
          deltaMap.set(key, {
            productType: newItem.productType,
            productId: newItem.product.toString(),
            name: productDoc?.name || 'N/A',
            old: 0,
            oldUnit: '',
            oldUnitPrice: 0,
            new: newItem.quantity,
            newUnit: newItem.unit || '',
            newUnitPrice: newItem.unitPrice || 0,
            delta: newItem.quantity
          })
        }
      }

      // CHECK TỒN KHO dựa trên delta
      for (const [key, { delta, productType, productId }] of deltaMap) {
        if (delta < 0) {
          // Cần GIẢM tồn kho (delta âm)
          const stockQuery = {
            warehouse: warehouse,
            organization: organizationId,
            product: null,
            combo: null
          }

          if (productType === 'Combo') {
            stockQuery.combo = productId
          } else {
            stockQuery.product = productId
          }

          const currentStock = await ProductStock.findOne(stockQuery).session(session)
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
      for (const [key, { delta, productType, productId }] of deltaMap) {
        if (delta !== 0) {
          // Query phải bao gồm CẢ 4 trường trong unique index
          const stockQuery = {
            warehouse: warehouse,
            organization: organizationId,
            product: null,
            combo: null
          }

          const setOnInsert = {
            warehouse: warehouse,
            organization: organizationId,
            product: null,
            combo: null
          }

          // Set field tương ứng với productType
          if (productType === 'Combo') {
            stockQuery.combo = productId
            setOnInsert.combo = productId
          } else {
            stockQuery.product = productId
            setOnInsert.product = productId
          }

          await ProductStock.updateOne(
            stockQuery,
            {
              $inc: { quantity: delta },
              $setOnInsert: setOnInsert
            },
            { upsert: true, session }
          )
        }
      }

      // Cập nhật thông tin phiếu nhập
      const updateData = {
        note,
        items,
        total: subTotal,
        updatedBy: req.user._id
      }

      const newEntry = await ProductEntry.findOneAndUpdate(findCondition, updateData, {
        new: true,
        session
      })

      if (!newEntry) throw new BusinessError('Cập nhật thất bại', 400)

      await newEntry.populate([
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy updatedBy lockedBy', select: 'username' },
        { path: 'items.product', select: 'name' }
      ])

      return { newEntry, oldEntry, deltaMap }
    })
    const { newEntry: updatedDoc, oldEntry, deltaMap } = transactionResult

    const changes = []

    // Thay đổi ghi chú
    if ((oldEntry.note || '') !== (updatedDoc.note || '')) {
      changes.push(`Ghi chú: "${oldEntry.note || '(Trống)'}" → "${updatedDoc.note || '(Trống)'}"`)
    }

    // Thay đổi sản phẩm
    const itemChanges = []
    for (const [key, data] of deltaMap) {
      const productLabel = data.productType === 'Combo' ? 'Combo' : 'Món'
      const hasQuantityChange = data.delta !== 0
      const hasUnitChange = data.oldUnit !== data.newUnit
      const hasPriceChange = data.oldUnitPrice !== data.newUnitPrice

      if (hasQuantityChange || hasUnitChange || hasPriceChange) {
        const changeDetails = []

        if (data.old === 0) {
          // Thêm mới
          changeDetails.push(`Thêm ${productLabel} "${data.name}"`)
          changeDetails.push(`Số lượng: ${data.new}`)
          if (data.newUnit) changeDetails.push(`Đơn vị: ${data.newUnit}`)
          if (data.newUnitPrice > 0)
            changeDetails.push(`Giá: ${data.newUnitPrice.toLocaleString()}đ`)
        } else if (data.new === 0) {
          // Xóa
          changeDetails.push(`Xóa ${productLabel} "${data.name}"`)
          changeDetails.push(`Số lượng: ${data.old}`)
        } else {
          // Sửa
          changeDetails.push(`${productLabel} "${data.name}"`)

          if (hasQuantityChange) {
            changeDetails.push(`Số lượng: ${data.old} → ${data.new}`)
          }

          if (hasUnitChange) {
            changeDetails.push(
              `Đơn vị: "${data.oldUnit || '(trống)'}" → "${data.newUnit || '(trống)'}"`
            )
          }

          if (hasPriceChange) {
            changeDetails.push(
              `Giá: ${data.oldUnitPrice.toLocaleString()}đ → ${data.newUnitPrice.toLocaleString()}đ`
            )
          }
        }

        itemChanges.push(changeDetails.join(', '))
      }
    }

    if (itemChanges.length > 0) {
      changes.push(`Sản phẩm: ${itemChanges.join('; ')}`)
    }

    // Ghi log nếu có thay đổi
    if (changes.length > 0) {
      const description = `Cập nhật phiếu nhập sản phẩm : ${updatedDoc.code} - ${changes.join(' | ')}`

      logActivity(
        organizationId,
        req.user._id,
        req.user.username,
        'UPDATE',
        'PRODUCT_ENTRY',
        description,
        updatedDoc.code,
        'SUCCESS',
        updatedDoc.warehouse || null
      )
    }

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu nhập thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode || 400)
    }
    console.error('Error updating product entry:', error)
    responseHelper.error(res, error.message)
  }
}

export const deleteProductEntries = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BusinessError('Không có phiếu nào được chọn để xóa')
      }

      // Tìm phiếu với warehouse filter nếu là Staff
      const findCondition = {
        _id: { $in: ids },
        organization: organizationId
      }

      // Staff chỉ được xóa phiếu của kho mình
      if (req.warehouseFilter) {
        findCondition.warehouse = req.warehouseFilter
      }

      // Lấy các phiếu nhập
      const entries = await ProductEntry.find(findCondition).session(session)

      if (!entries.length) {
        throw new BusinessError('Không tìm thấy phiếu nhập', 404)
      }

      const lockedEntries = entries.filter((e) => e.isLocked)
      if (lockedEntries.length > 0) {
        throw new BusinessError('Không thể xóa phiếu đã bị khóa', 400)
      }

      // Check tồn kho trước khi xóa
      for (const entry of entries) {
        if (entry.warehouse) {
          for (const item of entry.items) {
            if (item.product && item.quantity > 0) {
              const stockQuery = {
                warehouse: entry.warehouse,
                organization: organizationId
              }

              // Xác định trường product dựa vào productType
              if (item.productType === 'Combo') {
                stockQuery.combo = item.product
              } else {
                stockQuery.product = item.product
              }

              // Kiểm tra tồn kho hiện tại trước khi trừ
              const currentStock = await ProductStock.findOne(stockQuery).session(session)

              if (currentStock && currentStock.quantity < item.quantity) {
                throw new BusinessError(
                  `Không thể xóa phiếu. Tồn kho hiện tại không đủ để hoàn nguyên.`,
                  400
                )
              }
            }
          }
        }
      }

      // Trừ tồn kho từ ProductStock (hoàn nguyên khi xóa phiếu nhập)
      for (const entry of entries) {
        if (entry.warehouse) {
          for (const item of entry.items) {
            if (item.product && item.quantity > 0) {
              const stockQuery = {
                warehouse: entry.warehouse,
                organization: organizationId
              }

              // Xác định trường product dựa vào productType
              if (item.productType === 'Combo') {
                stockQuery.combo = item.product
              } else {
                stockQuery.product = item.product
              }

              await ProductStock.updateOne(
                stockQuery,
                { $inc: { quantity: -item.quantity } },
                { session }
              )
            }
          }
        }
      }

      // Xóa phiếu
      await ProductEntry.deleteMany(findCondition).session(session)

      const deletedCodes = entries.map((e) => e.code).join(', ')
      const warehouseId = entries[0]?.warehouse?._id

      logActivity(
        organizationId,
        req.user._id,
        req.user.username,
        'DELETE',
        'PRODUCT_ENTRY',
        `Đã xóa phiếu nhập kho sản phẩm: ${deletedCodes}`,
        '',
        'SUCCESS',
        warehouseId || null
      )
    })

    responseHelper.success(res, null, 'Xóa và cập nhật tồn kho thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      return responseHelper.error(res, error.message, error.statusCode || 400)
    }
    responseHelper.error(res, error.message)
  }
}

export const lockProductEntry = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return responseHelper.error(res, 'ID không hợp lệ', 400)
    }

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Tìm phiếu với warehouse filter nếu là Staff
    const findCondition = {
      _id: id,
      organization: organizationId
    }

    if (req.warehouseFilter) {
      findCondition.warehouse = req.warehouseFilter
    }

    const entry = await ProductEntry.findOne(findCondition)

    if (!entry) {
      return responseHelper.error(res, 'Không tìm thấy phiếu nhập', 404)
    }

    if (entry.isLocked) {
      return responseHelper.error(res, 'Phiếu nhập đã được khóa trước đó', 400)
    }

    if (!entry.items || entry.items.length === 0) {
      return responseHelper.error(res, 'Phiếu nhập không có sản phẩm nào', 400)
    }

    // Validate items
    for (const item of entry.items) {
      if (!item.product) {
        return responseHelper.error(res, 'Có sản phẩm thiếu thông tin product', 400)
      }
      if (!item.productType || !['MenuItem', 'Combo'].includes(item.productType)) {
        return responseHelper.error(res, 'Có sản phẩm với productType không hợp lệ', 400)
      }
      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return responseHelper.error(res, 'Có sản phẩm với số lượng không hợp lệ', 400)
      }
    }

    // Update lock state
    const updatedEntry = await ProductEntry.findOneAndUpdate(
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
      { new: true }
    )

    if (!updatedEntry) {
      return responseHelper.error(res, 'Không thể khóa phiếu nhập', 400)
    }

    // Populate để trả về đầy đủ thông tin
    const finalEntry = await ProductEntry.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('lockedBy', 'name username')
      .populate('items.product', 'name sku') // refPath tự động populate đúng model
      .populate('warehouse', 'name code location')
      .populate('createdBy updatedBy', 'username')

    logActivity(
      organizationId,
      req.user?._id,
      req.user?.username,
      'LOCK',
      'PRODUCT_ENTRY',
      `Đã khóa phiếu nhập kho sản phẩm "${finalEntry.code}"`,
      finalEntry.code,
      'SUCCESS',
      finalEntry.warehouse?._id || null
    )

    responseHelper.success(res, finalEntry, 'Đã khóa phiếu nhập thành công')
  } catch (err) {
    if (err instanceof BusinessError) {
      return responseHelper.error(res, err.message, err.statusCode || 400)
    }
    console.error('Error locking product entry:', err)
    responseHelper.error(res, err.message || 'Có lỗi xảy ra khi khóa phiếu nhập')
  }
}
