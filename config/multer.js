const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "jumia-products", // ⚠️ correct key is 'folder', not 'folders'
    allowed_formats: ["png", "jpg", "gif"], // ⚠️ key is 'allowed_formats'
    transformation: [{ width: 500, height: 500 }]
  }
});

const profilePicture = multer({ storage });

module.exports = profilePicture;
