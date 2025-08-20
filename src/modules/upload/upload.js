import upload from "./helper.js"

const uploadFile = (req, res) => {
  res.json({ file: req.file })
}

export { uploadFile, upload }
