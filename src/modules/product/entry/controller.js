import { ProductEntry, units } from './model.js'
import ProductStock from '../stock/model.js'
import mongoose from 'mongoose'
import responseHelper from '../../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../../helpers/orgHelper.js'
import { generateDocumentCode } from '../../../helpers/common.js'
import withTransaction from '../../../helpers/withTransaction.js'
import { lookupRef, lookupUser } from '../../../helpers/lookupHelper.js'
import BusinessError from '../../error/BusinessError.js'

export const createProductEntry = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    const entry = await withTransaction(async (session) => {
      const code = await generateDocumentCode(ProductEntry, 'PE')
      const date = new Date()
      const doc = new ProductEntry({
        code: code,
        date: date,
        createdBy: req.user._id,
        organization: organizationId
      })
      await doc.save({ session })
      return doc
    })

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

    const productEntry = await ProductEntry.findOne({ _id: id, organization: organizationId })
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

    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const basePipeline = [
      { $match: { organization: organizationId } },
      ...lookupRef('warehouse', 'Warehouses'),
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
      ...lookupRef('items.product', 'MenuItems', { as: 'product' }),
      ...lookupUser('createdBy')
    ]

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

    // Group lại theo phiếu vì trước đó đã unwind items
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
            product: '$product',
            quantity: '$items.quantity',
            unit: '$items.unit',
            unitPrice: '$items.unitPrice',
            total: '$items.total'
          }
        }
      }
    })

    basePipeline.push({ $sort: { [sortField]: sortDir } })

    const countPipeline = [...basePipeline, { $count: 'totalCount' }]
    const totalData = await ProductEntry.aggregate(countPipeline)
    const recordsTotal = totalData.length > 0 ? totalData[0].totalCount : 0

    // Phân trang
    basePipeline.push({ $skip: start })
    basePipeline.push({ $limit: length })

    // Query dữ liệu
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

    const updatedDoc = await withTransaction(async (session) => {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        throw new BusinessError('ID không hợp lệ', 400)
      }

      const oldEntry = await ProductEntry.findOne({
        _id: id,
        organization: organizationId
      }).session(session)

      if (!oldEntry) throw new BusinessError('Phiếu nhập không tồn tại', 404)
      if (oldEntry.isLocked)
        throw new BusinessError('Phiếu nhập đã bị khóa, không thể chỉnh sửa', 400)

      const { warehouse, items: rawItems = [], note } = req.body

      // Validation đầu vào
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new BusinessError('Phiếu nhập phải có ít nhất 1 sản phẩm', 400)
      }

      if (!warehouse) throw new BusinessError('Vui lòng chọn kho', 400)

      if (!mongoose.isValidObjectId(warehouse)) {
        throw new BusinessError('ID kho không hợp lệ', 400)
      }

      // Validate và parse items
      let subTotal = 0
      const items = []

      for (const item of rawItems) {
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
          product: item.product,
          quantity,
          unit: item.unit || null,
          unitPrice,
          total: itemTotal
        })
      }

      // Hoàn nguyên tồn kho từ phiếu cũ
      if (oldEntry.warehouse) {
        for (const item of oldEntry.items) {
          if (item.product && item.quantity > 0) {
            // Kiểm tra tồn kho hiện tại trước khi trừ
            const currentStock = await ProductStock.findOne({
              product: item.product,
              warehouse: oldEntry.warehouse,
              organization: organizationId
            }).session(session)

            if (currentStock && currentStock.quantity < item.quantity) {
              throw new BusinessError(
                `Không thể hoàn nguyên tồn kho. Tồn kho hiện tại không đủ.`,
                400
              )
            }

            await ProductStock.updateOne(
              {
                product: item.product,
                warehouse: oldEntry.warehouse,
                organization: organizationId
              },
              { $inc: { quantity: -item.quantity } },
              { session }
            )
          }
        }
      }

      // Cập nhật thông tin phiếu nhập
      const updateData = {
        warehouse,
        note,
        items,
        total: subTotal,
        updatedBy: req.user._id
      }

      const newEntry = await ProductEntry.findOneAndUpdate(
        {
          _id: id,
          organization: organizationId
        },
        updateData,
        { new: true, session }
      )

      if (!newEntry) throw new BusinessError('Cập nhật thất bại', 400)

      // Cộng tồn kho mới
      if (newEntry.warehouse) {
        for (const item of newEntry.items) {
          if (item.product && item.quantity > 0) {
            await ProductStock.updateOne(
              {
                product: item.product,
                warehouse: newEntry.warehouse,
                organization: organizationId
              },
              {
                $inc: { quantity: item.quantity }
              },
              { upsert: true, session }
            )
          }
        }
      }

      await newEntry.populate([
        { path: 'warehouse', select: 'name location' },
        { path: 'createdBy updatedBy lockedBy', select: 'username' },
        { path: 'items.product', select: 'name' }
      ])

      return newEntry
    })

    responseHelper.success(res, updatedDoc, 'Cập nhật phiếu nhập thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      // Trả về đúng HTTP code của BusinessError
      return responseHelper.error(res, error.message, error.statusCode || 400)
    }
    console.error('Error updating product entry:', error)
    responseHelper.error(res, error.message)
  }
}

export const deleteProductEntries = async (req, res) => {
  try {
    await withTransaction(async (session) => {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BusinessError('Không có phiếu nào được chọn để xóa')
      }

      const organizationId = getCurrentOrg(req)
      if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

      // Lấy các phiếu nhập
      const entries = await ProductEntry.find({
        _id: { $in: ids },
        organization: organizationId
      }).session(session)

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
              // Kiểm tra tồn kho hiện tại trước khi trừ
              const currentStock = await ProductStock.findOne({
                product: item.product,
                warehouse: entry.warehouse,
                organization: organizationId
              }).session(session)

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
              await ProductStock.updateOne(
                {
                  product: item.product,
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

      // Xóa phiếu
      await ProductEntry.deleteMany({
        _id: { $in: ids },
        organization: organizationId
      }).session(session)
    })

    responseHelper.success(res, null, 'Xóa và cập nhật tồn kho thành công')
  } catch (error) {
    if (error instanceof BusinessError) {
      // Trả về đúng HTTP code của BusinessError
      return responseHelper.error(res, error.message, error.statusCode || 400)
    }
    responseHelper.error(res, error.message)
  }
}
