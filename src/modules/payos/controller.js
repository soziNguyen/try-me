import BillingWallet from '../billing-wallet/model.js'
import BillingWalletTransaction from '../billing-wallet-transaction/model.js'
import responseHelper from '../../helpers/responseHelper.js'
import withTransaction from '../../helpers/withTransaction.js'

export const payosWebhook = async (req, res) => {
  try {
    const { orderCode, status } = req.body

    if (!orderCode || !status) {
      return responseHelper.error(res, 'Payload PayOS không hợp lệ', 400)
    }

    await withTransaction(async (session) => {
      const tx = await BillingWalletTransaction.findOne({
        externalTransactionId: orderCode
      }).session(session)

      if (!tx) {
        throw new Error('Không tìm thấy giao dịch')
      }

      if (tx.status !== 'pending') {
        return
      }

      if (status === 'PAID') {
        const wallet = await BillingWallet.findById(tx.wallet).session(session)

        wallet.balance += tx.amount
        await wallet.save({ session })

        tx.status = 'completed'
        tx.balanceAfter = wallet.balance
      }

      if (status === 'CANCELLED' || status === 'FAILED') {
        tx.status = 'failed'
      }

      await tx.save({ session })
    })

    return responseHelper.success(res, null, 'Webhook PayOS đã được xử lý')
  } catch (error) {
    console.error('PayOS webhook error:', error)
    responseHelper.error(res, error.message || 'Lỗi xử lý webhook PayOS')
  }
}
