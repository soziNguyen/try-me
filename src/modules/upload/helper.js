import multer from "multer"
import fs from "fs"
import path from "path"

// Middleware để tự động tạo thư mục theo năm/tháng
// Hàm tạo storage cho multer
const getStorage = () => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0") // Định dạng tháng 2 chữ số
      const uploadPath = path.join("uploads", `${year}`, `${month}`)

      // Tạo thư mục nếu chưa tồn tại
      fs.mkdirSync(uploadPath, { recursive: true })

      cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)) // Đặt tên file theo timestamp
    }
  })
}

export const deleteFile = async (filePath) => {
  if (!filePath) return
  const fullPath = path.join(process.cwd(), filePath)

  return new Promise((resolve, reject) => {
    fs.access(fullPath, fs.constants.F_OK, (err) => {
      if (err) return resolve() // file không tồn tại, bỏ qua
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error('Lỗi xóa file:', err)
          return reject(err)
        }
        resolve()
      })
    })
  })
}

// Hàm khởi tạo multer
const upload = multer({ storage: getStorage() })

export default upload
