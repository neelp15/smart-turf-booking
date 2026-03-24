const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadImage = async (req, res) => {
  try {
    const fileStr = req.body.data;
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'smart-turf-booking',
      folder: 'turf-connect/turfs'
    });
    res.json({ url: uploadResponse.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: 'Image upload failed' });
  }
};
