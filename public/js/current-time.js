const currentTime = document.getElementById('currentTime')
  setInterval(() => {
    currentTime.textContent = new Date().toLocaleString()
  }, 1000)