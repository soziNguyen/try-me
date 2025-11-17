import app from './app.js'
import { createServer } from 'http'
import { Server } from 'socket.io'

const port = app.get('port')

// Tạo HTTP server
const httpServer = createServer(app)

// Khởi tạo Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
})

// Lưu io vào app để controller dùng được
app.set('io', io)

// Lắng nghe connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Cho nhân viên join room riêng
  socket.on('staff_join', () => {
    socket.join('staff_room')
    console.log('Staff joined room.')
  })

  // Sự kiện khách gọi nhân viên
  socket.on('customer_call_staff', (data) => {
    console.log('Customer call:', data)

    // Gửi thông báo cho tất cả nhân viên
    io.to('staff_room').emit('staff_notification', data)
  })
})

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
