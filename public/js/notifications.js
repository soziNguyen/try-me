const socket = io()

const notificationBtn = document.getElementById('notificationBtn')
const notificationModalBody = document.getElementById('notificationModalBody')
const notificationBadge = document.getElementById('notificationBadge')

// Tạo đối tượng Audio
const notificationSound = new Audio('/assets/sounds/sound.wav')
notificationSound.preload = 'auto'
notificationSound.volume = 1

let audioEnabled = false

// Enable audio sau lần đầu user click
document.addEventListener(
  'click',
  function enableAudio() {
    audioEnabled = true
    notificationSound.volume = 0
    notificationSound.play().then(() => {
      notificationSound.pause()
      notificationSound.currentTime = 0
      notificationSound.volume = 1
    })
    document.removeEventListener('click', enableAudio)
  },
  { once: true }
)

// Nhân viên join room
socket.emit('staff_join')

// Nhận notification từ socket
socket.on('staff_notification', (data) => {
  appendNotificationToModal(data)
  saveNotification(data)
  saveUnseenNotification(data)
  showBadge()

  if (audioEnabled) {
    notificationSound.currentTime = 0
    notificationSound.play().catch(() => {})
  }
})

// Lưu notification
function saveNotification(data) {
  const noti = JSON.parse(localStorage.getItem('staff_notifications') || '[]')
  noti.push(data)
  localStorage.setItem('staff_notifications', JSON.stringify(noti))
}

// Lưu notification chưa xem
function saveUnseenNotification(data) {
  const unseen = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  unseen.push(data)
  localStorage.setItem('staff_notifications_unseen', JSON.stringify(unseen))
}

// Append vào modal
async function appendNotificationToModal(data) {
  if (!data.tableName && data.tableId) {
    try {
      const table = await ajax(`/api/tables/${data.tableId}`, {}, 'GET')
      data.tableName = table?.name ? `Bàn ${table.name}` : `Bàn ${data.tableId}`
    } catch {
      data.tableName = `Bàn ${data.tableId}`
    }
  }

  const html = `
    <div class="border-bottom py-2">
      <strong>${data.tableName}</strong> gửi yêu cầu hỗ trợ<br>
      <small>${new Date(data.time).toLocaleString()}</small>
    </div>
  `
  notificationModalBody.insertAdjacentHTML('afterbegin', html)

  const $modalBody = $('#notificationModalBody')
  if ($modalBody.parent('.mCustomScrollbar').length) {
    $modalBody.mCustomScrollbar('update')
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const saved = JSON.parse(localStorage.getItem('staff_notifications') || '[]')

  for (const item of saved) {
    await appendNotificationToModal(item)
  }

  const unseen = JSON.parse(localStorage.getItem('staff_notifications_unseen') || '[]')
  if (unseen.length) showBadge()

  if (notificationBtn && !notificationBtn.dataset.bound) {
    notificationBtn.dataset.bound = true
    notificationBtn.addEventListener('click', () => {
      showModal('notificationModal').show()
      hideBadge()
      localStorage.setItem('staff_notifications_unseen', '[]')
    })
  }

  customScrollbarInit()
})

// Badge
function showBadge() {
  notificationBadge?.classList.remove('d-none')
}

function hideBadge() {
  notificationBadge?.classList.add('d-none')
}

function customScrollbarInit() {
  $('#notificationModalBody').mCustomScrollbar({
    theme: 'minimal-dark',
    axis: 'y',
    scrollInertia: 200,
    mouseWheel: { deltaFactor: 20, preventDefault: true }
  })
}
