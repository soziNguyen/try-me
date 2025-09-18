import InvoiceOptions from './model.js'
import responseHelper from '../../helpers/responseHelper.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'

export const getInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const options = await InvoiceOptions.findOne({ organizationId })
    responseHelper.success(res, options)
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const updateInvoiceOptions = async (req, res) => {
  try {
    const organizationId = getCurrentOrg(req)
    if (!organizationId) return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)

    const { headerText, footerText, hotline, logo, prefix } = req.body

    const data = { headerText, footerText, hotline, logo, prefix }

    const options = await InvoiceOptions.findOneAndUpdate({ organizationId }, data, {
      upsert: true,
      new: true
    })

    responseHelper.success(res, options, 'Cập nhật thành công')
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
