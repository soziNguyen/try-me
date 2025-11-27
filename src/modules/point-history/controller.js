import Customer from '../customer/model'
import PointHistory from './model'
import { getCurrentOrg } from '../../helpers/orgHelper'
import responseHelper from '../../helpers/responseHelper'

export const getCustomerPointHistoryById = async (req, res) => {
  try {
    const { id } = req.params
    const organizationId = getCurrentOrg(req)

    if (!organizationId) {
      return responseHelper.error(res, 'Thiếu thông tin tổ chức', 400)
    }

    // Validate customer
    const customer = await Customer.findOne({
      _id: id,
      organization: organizationId
    })

    if (!customer) {
      return responseHelper.error(res, 'Khách hàng không tồn tại', 404)
    }

    // Lấy lịch sử điểm
    const history = await PointHistory.find({
      customerId: id,
      organization: organizationId
    })
      .sort({ createdAt: -1 })
      .populate('orderId', 'code')
      .populate('createdBy', 'username')
      .lean()

    return responseHelper.success(res, {
      customer: {
        name: customer.name,
        phone: customer.phone,
        currentPoints: customer.totalPoints
      },
      history
    })
  } catch (error) {
    return responseHelper.error(res, error.message)
  }
}
