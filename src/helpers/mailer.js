import SMTP from '../configs/smtp.js'
import nodemailer from 'nodemailer'

const mailer = nodemailer.createTransport({
  host: SMTP.host,
  port: SMTP.port,
  secure: SMTP.secure,
  auth: {
    user: SMTP.username,
    pass: SMTP.password
  }
})
mailer.verify().then(console.log('Mail OK')).catch(console.error)

export default mailer
