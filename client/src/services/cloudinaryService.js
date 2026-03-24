const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a single image file to Cloudinary using an unsigned upload preset.
 * @param {File} file - The image file to upload.
 * @returns {Promise<string>} - The secure URL of the uploaded image.
 */
export const uploadImageToCloudinary = async (file) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "turf-connect/turfs");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.error?.message || "Image upload failed.");
  }

  const data = await res.json();
  return data.secure_url;
};

/**
 * Uploads multiple image files to Cloudinary in parallel.
 * @param {File[]} files - Array of image files.
 * @returns {Promise<string[]>} - Array of secure URLs.
 */
export const uploadMultipleImages = async (files) => {
  return Promise.all(files.map(uploadImageToCloudinary));
};
