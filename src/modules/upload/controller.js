import upload, { processImages, deleteFile } from './helper.js'

const uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Không có file được upload'
      })
    }

    // Thông tin file sau khi xử lý
    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      isImage: req.file.mimetype.startsWith('image/'),
      url: `/${req.file.path.replace(/\\/g, '/')}`
    }

    if (req.file.compressionInfo) {
      fileInfo.compressionInfo = req.file.compressionInfo
    }

    res.json({
      success: true,
      message: fileInfo.isImage ? 'Upload và nén ảnh thành công' : 'Upload file thành công',
      file: fileInfo
    })
  } catch (error) {
    console.error('Lỗi upload:', error)
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xử lý file'
    })
  }
}

// Controller cho upload multiple files
const uploadMultipleFiles = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Không có file được upload'
      })
    }

    const filesInfo = req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      isImage: file.mimetype.startsWith('image/'),
      url: `/${file.path.replace(/\\/g, '/')}`
    }))

    const imageCount = filesInfo.filter((f) => f.isImage).length
    const otherCount = filesInfo.length - imageCount

    res.json({
      success: true,
      message: `Upload thành công: ${imageCount} ảnh đã được nén, ${otherCount} file khác`,
      files: filesInfo
    })
  } catch (error) {
    console.error('Lỗi upload multiple:', error)
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xử lý file'
    })
  }
}

export { uploadFile, uploadMultipleFiles, upload, processImages, deleteFile }
