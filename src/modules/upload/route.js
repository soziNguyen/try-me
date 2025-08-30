import express from "express"
import multer from "multer"
import { uploadFile, uploadMultipleFiles, upload, processImages } from "./controller.js"

const router = express.Router()

// Route upload single file
router.post("/api/upload",
    upload.single("file"),
    processImages,
    uploadFile
)

// Route upload multiple files
router.post("/api/upload-multiple",
    upload.array("files", 10), // Tối đa 10 files
    processImages,
    uploadMultipleFiles
)

// Route upload với field names cụ thể
router.post("/api/upload-mixed",
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'images', maxCount: 5 },
        { name: 'documents', maxCount: 3 }
    ]),
    processImages,
    (req, res) => {
        try {
            const result = {}

            if (req.files.avatar) {
                result.avatar = req.files.avatar[0]
            }

            if (req.files.images) {
                result.images = req.files.images
            }

            if (req.files.documents) {
                result.documents = req.files.documents
            }

            res.json({
                success: true,
                message: 'Upload thành công',
                files: result
            })
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Lỗi xử lý upload mixed files'
            })
        }
    }
)

// Error handling middleware cho multer
router.use((error, req, res, next) => {
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