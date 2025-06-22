const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join("./public");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginalName = path
      .basename(file.originalname)
      .replace(/\s+/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + sanitizedOriginalName);
  },
});

// Set up multer instance with storage and file filtering
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const supportedFile = /jpg|jpeg|png|webp|svg|pdf/;
    const extension = path.extname(file.originalname).toLowerCase();

    console.log("File Extension:", extension);

    if (supportedFile.test(extension)) {
      cb(null, true);
    } else {
      cb(new Error("Must be a jpg/png/jpeg/webp/svg/pdf file"), false);
    }
  },
});

module.exports = upload;
