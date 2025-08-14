import upload from "../helpers/uploadHelper.js"

const uploadFile = (req, res) => {
  res.json({ file: req.file })
}

export { uploadFile, upload }
