import express from "express"
import { uploadFile, upload } from "../controllers/upload.js"

const router = express.Router()

router.post("/api/upload", upload.single("file"), uploadFile)

export default router  