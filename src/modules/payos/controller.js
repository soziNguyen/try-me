import BillingWallet from '../billing-wallet/model.js'
import BillingWalletTransaction from '../billing-wallet-transaction/model.js'
import responseHelper from '../../helpers/responseHelper.js'
import withTransaction from '../../helpers/withTransaction.js'

export const payosWebhook = async (req, res) => {
  try {
    console.log('=== Payos Webhook ===')
    console.log('WEBHOOK SIGNATURE:', req.headers['x-payos-signature'])
    console.log('WEBHOOK BODY:', JSON.stringify(req.body, null, 2))

    // Verify webhook signature
    const signature = req.headers['x-payos-signature']
    if (!signature) {
      return responseHelper.error(res, 'Thiếu chữ ký PayOS', 400)
    }

    // SDK v2 verify
    payOS.webhooks.verify(req.body, signature)

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

      // Idempotent: đã xử lý rồi thì bỏ qua
      if (tx.status !== 'pending') {
        return
      }

      // Map trạng thái PayOS → hệ thống
      if (status === 'PAID') {
        const wallet = await BillingWallet.findById(tx.wallet).session(session)
        if (!wallet) {
          throw new Error('Không tìm thấy ví')
        }

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

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('PayOS webhook error:', error)
    return res.status(400).json({ success: false })
  }
}
