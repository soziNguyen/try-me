import express from 'express'
import multer from 'multer'
import {
  uploadFile,
  uploadMultipleFiles,
  upload,
  processImages
} from './controller.js'

const router = express.Router()

// Route upload single file
router.post('/api/upload', upload.single('file'), processImages, uploadFile)

// Route upload multiple files
router.post(
  '/api/upload-multiple',
  upload.array('files', 10), // Tối đa 10 files
  processImages,
  uploadMultipleFiles
)

// Error handling middleware cho multer
router.use((error, req, res, _next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File quá lớn (tối đa 50MB)'
        })
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Quá nhiều file được upload'
        })
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Field name không hợp lệ'
        })
      default:
        return res.status(400).json({
          success: false,
          error: `Lỗi upload: ${error.message}`
        })
    }
  }

  res.status(500).json({
    success: false,
    error: error.message || 'Lỗi server không xác định'
  })
})

export default router
