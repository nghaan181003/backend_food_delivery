const fs = require("fs");
const path = require("path");
// single image file upload -> image path
const returnSingleFilePath = async (files, field = "single") => {
  let filePath;
  if (files && Object.keys(files).length > 0) {
    if (Array.isArray(files)) {
      filePath = files[0].path;
    } else {
      filePath = files[field]?.[0]?.path;
    }
  }
  return filePath;
};

// mutiple image file upload -> image paths
const returnMultipleFilePath = async (files, field = "multiple") => {
  let imagesPaths = [];

  if (files && Object.keys(files).length > 0) {
    files[field].map((item) => {
      imagesPaths.push(item.path);
    });
  }

  return imagesPaths;
};

// Function to move a single file to a specific folder
const singleFileTransfer = (filePath, destinationFolder) => {
  const fileName = path.basename(filePath);
  const newFilePath = path.join("./public", destinationFolder, fileName);
  // const fileUrl = `public/${destinationFolder}/${fileName}`; // the new URL of the file
  const fileUrl = `http://localhost:8081/public/${destinationFolder}/${fileName}`;

  // Check if the destination folder exists; if not, create it
  if (!fs.existsSync(path.dirname(newFilePath))) {
    fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
  }

  // Move the file to the destination folder
  fs.rename(filePath, newFilePath, (err) => {
    if (err) {
      console.log(`Error moving file: ${err}`);
    } else {
      console.log(`File moved successfully to ${newFilePath}`);
    }
  });

  return fileUrl;
};

// Function to move multiple files to a specific folder
const multipleFilesTransfer = async (imagePaths, destinationFolder) => {
  const paths = [];

  imagePaths.map((item) => {
    const newPath = singleFileTransfer(item, destinationFolder);
    paths.push(newPath);
  });

  return paths;
};

const removeFile = async (imgPath) => {
  if (fs.existsSync(imgPath)) {
    fs.unlinkSync(imgPath);
    console.log(`File ${imgPath} deleted successfully`);
  } else {
    console.log(`File ${imgPath} does not exist`);
  }
};



module.exports = {
  returnSingleFilePath,
  returnMultipleFilePath,
  singleFileTransfer,
  multipleFilesTransfer,
  removeFile,
};
