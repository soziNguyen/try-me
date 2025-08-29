import multer from "multer"
import fs from "fs"
import path from "path"
import sharp from "sharp"

// Cấu hình nén ảnh
const IMAGE_CONFIG = {
  jpeg: {
    quality: 80,
    progressive: true
  },
  png: {
    compressionLevel: 6,
    progressive: true
  },
  webp: {
    quality: 80
  },
  maxWidth: 1920,
  maxHeight: 1080
}

// Hàm nén ảnh từ buffer
const compressImageFromBuffer = async (buffer, outputPath, mimetype) => {
  try {
    let pipeline = sharp(buffer)
      .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })

    // Áp dụng cấu hình nén theo loại file
    if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
      pipeline = pipeline.jpeg(IMAGE_CONFIG.jpeg)
    } else if (mimetype.includes('png')) {
      pipeline = pipeline.png(IMAGE_CONFIG.png)
    } else if (mimetype.includes('webp')) {
      pipeline = pipeline.webp(IMAGE_CONFIG.webp)
    }

    await pipeline.toFile(outputPath)

  } catch (error) {
    console.error('Lỗi khi nén ảnh:', error)
    throw error
  }
}

// Hàm tạo storage cho multer
const getStorage = () => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const uploadPath = path.join("uploads", `${year}`, `${month}`)

      // Tạo thư mục nếu chưa tồn tại
      fs.mkdirSync(uploadPath, { recursive: true })

      cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now()
      const ext = path.extname(file.originalname)
      const fileName = `${timestamp}${ext}`

      cb(null, fileName)
    }
  })
}

// Tạo memory storage cho ảnh
const getMemoryStorage = () => {
  return multer.memoryStorage()
}

// Middleware xử lý sau khi upload
export const processImages = async (req, res, next) => {
  if (!req.files && !req.file) {
    return next()
  }

  try {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file]

    for (const file of files) {
      const isImage = file.mimetype.startsWith('image/')

      if (isImage && file.buffer) {
        // Xử lý ảnh từ memory buffer
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const uploadPath = path.join("uploads", `${year}`, `${month}`)

        // Tạo thư mục nếu chưa tồn tại
        fs.mkdirSync(uploadPath, { recursive: true })

        const fileName = `${Date.now()}${path.extname(file.originalname)}`
        const finalPath = path.join(uploadPath, fileName)

        // Nén ảnh từ buffer
        await compressImageFromBuffer(file.buffer, finalPath, file.mimetype)

        // Cập nhật thông tin file
        file.path = finalPath
        file.filename = fileName
        file.destination = uploadPath

        // Lấy size sau khi nén
        const stats = fs.statSync(finalPath)
        file.size = stats.size
      }
    }

    next()
  } catch (error) {
    console.error('Lỗi xử lý ảnh:', error)
    next(error)
  }
}

// File filter để kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Cho phép tất cả file, nhưng chỉ nén ảnh
  cb(null, true)
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

// Hàm khởi tạo multer với storage linh hoạt
const createUpload = (useMemory = true) => {
  return multer({
    storage: useMemory ? getMemoryStorage() : getStorage(),
    fileFilter: fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024 // Giới hạn 50MB cho file gốc
    }
  })
}

// Default upload sử dụng memory storage cho ảnh
const upload = createUpload(true)

export default upload