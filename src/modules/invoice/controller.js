import InvoiceOptions from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { deleteFile } from '../upload/helper.js'
import Organization from '../organization/model.js'
import { logActivity } from '../activity-logs/service.js'
import { buildChangeLog } from '../../helpers/changeLog.js'

export const getInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Xác định warehouse
    let warehouseId = null

    if (req.warehouseFilter) {
      // Staff user - chỉ thấy kho được gán
      warehouseId = req.warehouseFilter
    } else {
      // Admin/Org - sử dụng defaultWarehouse
      const org = await Organization.findById(organizationId).select('defaultWarehouse')
      if (org?.defaultWarehouse) {
        warehouseId = org.defaultWarehouse
      }
    }

    if (!warehouseId) {
      return responseHelper.error(res, 'Không tìm thấy warehouse', 400)
    }

    // Query
    const baseMatch = {
      organizationId: organizationId,
      warehouseId: warehouseId
    }

    let options = await InvoiceOptions.findOne(baseMatch)

    if (!options) {
      options = await InvoiceOptions.create({
        organizationId,
        warehouseId,
        logo: '',
        invoiceTitle: '',
        prefix: '',
        header: '',
        footer: ''
      })

      logActivity(
        organizationId,
        req.user._id,
        req.user.username || 'Unknown',
        'CREATE',
        'INVOICE_OPTIONS',
        'Tạo mới cài đặt hóa đơn'
      )
    }

    responseHelper.success(res, options)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    // Lấy warehouse mặc định của Org/Admin
    const org = await Organization.findById(organizationId).select('defaultWarehouse')
    if (!org?.defaultWarehouse) {
      return responseHelper.error(
        res,
        'Tổ chức chưa thiết lập kho mặc định. Vui lòng cập nhật kho trong phần hồ sơ.',
        400
      )
    }
    const warehouseId = org.defaultWarehouse

    // Lấy record cũ để kiểm tra ảnh cũ
    const oldOptions = await InvoiceOptions.findOne({ organizationId, warehouseId })

    const updateData = {}
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key]
    })

    const options = await InvoiceOptions.findOneAndUpdate(
      { organizationId, warehouseId },
      { $set: updateData },
      { upsert: true, new: true }
    )

    // Nếu có ảnh cũ và ảnh mới khác hoặc ảnh mới là null → xóa ảnh cũ
    if (oldOptions?.logo && updateData.logo !== undefined && oldOptions.logo !== updateData.logo) {
      try {
        await deleteFile(oldOptions.logo)
      } catch (err) {
        console.error('Không xóa được file cũ:', err)
      }
    }

    const changeDetailsInv = buildChangeLog(
      oldOptions,
      options,
      [
        { field: 'logo', label: 'Logo' },
        { field: 'invoiceTitle', label: 'Tiêu đề' },
        { field: 'prefix', label: 'Tiền tố' },
        { field: 'header', label: 'Header' },
        { field: 'footer', label: 'Footer' }
      ],
      'hóa đơn'
    )

    logActivity(
      organizationId,
      req.user._id,
      req.user.username,
      'UPDATE',
      'INVOICE_OPTIONS',
      changeDetailsInv,
      options.invoiceTitle || ''
    )

    responseHelper.success(res, options, 'Cập nhật thành công')
  } catch (error) {
    logActivity(
      getCurrentOrg(req),
      req.user?._id,
      req.user?.username || 'Unknown',
      'FAILED',
      'INVOICE_OPTIONS',
      error.message,
      null
    )
    responseHelper.error(res, error.message)
  }
}
