import InvoiceOptions from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { deleteFile } from '../upload/helper.js'

export const getInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    let options = await InvoiceOptions.findOne({ organizationId })
    if (!options) {
      options = await InvoiceOptions.create({
        organizationId,
        logo: '',
        invoiceTitle: '',
        prefix: '',
        header: '',
        footer: ''
      })
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

    // Lấy record cũ để kiểm tra ảnh cũ
    const oldOptions = await InvoiceOptions.findOne({ organizationId })

    const updateData = {}
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) updateData[key] = req.body[key]
    })

    const options = await InvoiceOptions.findOneAndUpdate(
      { organizationId },
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
    responseHelper.success(res, options, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
