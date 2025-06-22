const cloudinary = require("../config/cloundinary.config.v1")
//1. upload from url image
const uploadImageFromUrl = async () => {
    try {
        const urlImage = 'https://down-zl-vn.img.susercontent.com/vn-11134512-7ra0g-m77duecaeyjc1f';
        const folderName = 'product/1002', newFileName = 'testdemo'
        const result = await cloudinary.uploader.upload(urlImage, {
            public_id: newFileName,
            folder: folderName,
        })
        console.log(result)
        return result
    }
    catch (error) {
        console.log("Upload error::", error)
    }

}

//2. upload from image local
const uploadImageFromLocal = async ({
    path,
    folderName = 'product/1002'
}) => {
    try {
        const result = await cloudinary.uploader.upload(path, {
            public_id: 'thumb',
            folder: folderName,
        })
        console.log(result)
        return {
            image_url: result.secure_url,
            shopId: 1002

        }
    }
    catch (error) {
        console.log("Upload error::", error)
    }

}

//3. upload base64 Image
const uploadBase64Image = async ({
    base64String, folderName = 'product/1003'
}) => {
    try {
        const resutl = await cloudinary.uploader.upload(base64String, {
            folder: folderName
        })
        return {
            image_url: resutl.secure_url
        }
    }
    catch {

    }
}

module.exports = {
    uploadImageFromUrl,
    uploadImageFromLocal,
    uploadBase64Image
}