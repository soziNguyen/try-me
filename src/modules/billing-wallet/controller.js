import responseHelper from '../../helpers/responseHelper.js'
import BillingWallet from './model.js'
import BillingWalletTransaction from '../billing-wallet-transaction/model.js'
import { getCurrentOrg } from '../../helpers/orgHelper.js'
import { payOS } from '../payos/service.js'
import { generateOrderCode } from '../../helpers/common.js'

export const getWalletInfo = async (req, res) => {
  try {
    const orgId = getCurrentOrg(req)
    const wallet = await BillingWallet.findOne({ organization: orgId })
    if (!wallet) {
      return responseHelper.error(res, 'Ví chưa tồn tại', 404)
    }

    const transactions = await BillingWalletTransaction.find({ organization: orgId })
      .populate('wallet', 'balance currency')
      .sort({ createdAt: -1 })
      .limit(50)

    responseHelper.success(res, { wallet, transactions })
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}

export const walletTopup = async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) {
      return responseHelper.error(res, 'Số tiền không hợp lệ', 400)
    }

    if (amount < 10000) {
      return responseHelper.error(res, 'Số tiền nạp tối thiểu là 10,000đ', 400)
    }

    const orgId = getCurrentOrg(req)

    let wallet = await BillingWallet.findOne({ organization: orgId })
    if (!wallet) {
      wallet = await BillingWallet.create({ organization: orgId, balance: 0 })
    }

    // Tạo transaction pending
    const tx = await BillingWalletTransaction.create({
      wallet: wallet._id,
      organization: orgId,
      type: 'credit',
      amount,
      source: 'manual',
      reason: `Nạp tiền qua PayOS`,
      status: 'pending'
    })

    const orderCode = generateOrderCode()

    const payment = await payOS.paymentRequests.create({
      orderCode,
      amount: tx.amount,
      description: `Nap tien vi`,
      returnUrl: `${process.env.DOMAIN}/api/payos/return`,
      cancelUrl: `${process.env.DOMAIN}/api/payos/return`
    })

    tx.externalTransactionId = orderCode
    tx.paymentProvider = 'payos'
    await tx.save()

    responseHelper.success(
      res,
      { paymentUrl: payment.checkoutUrl, transactionId: tx._id },
      'Tạo giao dịch nạp tiền thành công, chờ xác nhận từ cổng thanh toán'
    )
  } catch (error) {
    responseHelper.error(res, error.message)
  }
}
