const socket = io()

const notificationBtn = document.getElementById('notificationBtn')
const notificationModalBody = document.querySelector('#notificationModal .modal-body')
const notificationBadge = document.getElementById('notificationBadge')

// Tạo đối tượng Audio
const notificationSound = new Audio('/assets/sounds/sound.wav')
notificationSound.preload = 'auto'
notificationSound.volume = 1

// Biến theo dõi trạng thái audio
let audioEnabled = false

// Enable audio sau lần tương tác đầu tiên của user
document.addEventListener(
  'click',
  function enableAudio() {
    audioEnabled = true
    // Thử phát âm thanh với volume 0 để "unlock" audio context
    notificationSound.volume = 0
    notificationSound
      .play()
      .then(() => {
        notificationSound.pause()
        notificationSound.currentTime = 0
        notificationSound.volume = 1
        // console.log('✅ Audio enabled')
      })
      .catch(() => {})

    // Chỉ cần enable 1 lần
    document.removeEventListener('click', enableAudio)
  },
  { once: true }
)

// Khi nhân viên mở trang => join room staff
socket.emit('staff_join')

// Nhận notification từ socket
socket.on('staff_notification', (data) => {
  appendNotificationToModal(data)
  saveNotification(data)
  saveUnseenNotification(data)
  showBadge()

  // Phát âm thanh nếu đã được enable
  if (audioEnabled) {
    notificationSound.currentTime = 0 // Reset về đầu
    notificationSound
      .play()
      .then(() => console.log('🔔 Sound played'))
      .catch((error) => {
        console.error('Cannot play sound:', error.message)
        if (error.name === 'NotAllowedError') {
          console.warn('⚠️ User needs to interact with page first')
        }
      })
  } else {
    console.warn('⚠️ Audio not enabled yet. User needs to click on page first.')
  }
})

// Lưu tất cả notification vào localStorage
function saveNotification(data) {
  let notifications = JSON.parse(localStorage.getItem('staff_notifications') || '[]')
  notifications.push(data)
  localStorage.setItem('staff_notifications', JSON.stringify(notifications))
}

// Lưu notification chưa xem
function saveUnseenNotification(data) {
  let unseen = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  unseen.push(data)
  localStorage.setItem('staff_notifications_unseen', JSON.stringify(unseen))
}

// Append notification vào modal, gọi API nếu chưa có tableName
async function appendNotificationToModal(data) {
  if (!data.tableName && data.tableId) {
    try {
      const result = await ajax(`/api/tables/${data.tableId}`, {}, 'GET')
      if (result) {
        const table = result
        data.tableName = table.name ? `Bàn ${table.name}` : `Bàn ${data.tableId}`
      } else {
        data.tableName = `Bàn ${data.tableId}`
      }
    } catch (err) {
      console.error(err)
      data.tableName = `Bàn ${data.tableId}`
    }
  }

  const item = `
    <div class="border-bottom py-2">
      <strong>${data.tableName}</strong> gửi yêu cầu hỗ trợ<br>
      <small>${new Date(data.time).toLocaleString()}</small>
    </div>
  `
  notificationModalBody.insertAdjacentHTML('afterbegin', item)
}

// Khi load trang, render lại modal từ localStorage
document.addEventListener('DOMContentLoaded', () => {
  const saved = JSON.parse(localStorage.getItem('staff_notifications') || '[]')
  saved.forEach(appendNotificationToModal)

  // Nếu còn notification chưa đọc => hiện badge
  const unseen = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  if (unseen.length) showBadge()

  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      showModal('notificationModal').show()
      hideBadge()
      // Xóa tất cả notification chưa đọc khi mở modal
      localStorage.setItem('staff_notifications_unseen', '[]')
    })
  }
})

// Hiển thị chấm đỏ
function showBadge() {
  if (!notificationBadge) return
  notificationBadge.classList.remove('d-none')
}

// Ẩn chấm đỏ khi xem
function hideBadge() {
  if (!notificationBadge) return
  notificationBadge.classList.add('d-none')
}
