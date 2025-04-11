import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import ApiError from './ApiError.js';

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath)
      return new ApiError(404, 'could not find the local file path');
    //upload the file on cloudinary
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });
    //file has been succcessfuly uploaded
    console.log('cloudinary.js', uploadResult);
    fs.unlinkSync(localFilePath);
    return uploadResult;
  } catch (err) {
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got filed
    console.log(err);
    return null;
  }
};
/**
 * Extracts the public ID from a Cloudinary URL.
 *
 * @param {string} url - The full Cloudinary URL of the resource.
 * @returns {string} - The extracted public ID of the resource.
 * @throws {Error} - Throws an error if the URL is invalid or cannot be parsed.
 */
function extractPublicIdFromCloudinaryUrl(url) {
  // Step 1: Validate that the URL is provided and is a string
  if (!url || typeof url !== 'string') {
    throw new ApiError(
      400,
      'Invalid Cloudinary URL: URL must be a non-empty string.'
    );
  }
  // Step 2: Split the URL by '/' to break it into parts
  const parts = url.split('/');
  console.log("URL parts after splitting by '/':", parts);
  // Step 3: Extract the last part of the URL (this should contain the file name)
  const fileNameWithExtension = parts[parts.length - 1];
  console.log('File name with extension:', fileNameWithExtension);

  // Step 4: Validate that the file name exists and contains a '.'
  if (!fileNameWithExtension || !fileNameWithExtension.includes('.')) {
    throw new ApiError(
      400,
      'Invalid Cloudinary URL: File name missing or improperly formatted.'
    );
  }
  // Step 5: Split the file name by '.' to separate the public ID from the file extension
  const [publicId, ...rest] = fileNameWithExtension.split('.');
  console.log('Extracted public ID:', publicId);

  // Step 6: Validate that the public ID is not empty
  if (!publicId) {
    throw new ApiError(
      400,
      'Invalid Cloudinary URL: Public ID could not be extracted.'
    );
  }

  // Step 7: Return the extracted public ID
  return publicId;
}

export { uploadOnCloudinary, extractPublicIdFromCloudinaryUrl };
// Upload an image
//     const uploadResult = await cloudinary.uploader
//     .upload(
//         'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//             public_id: 'shoes',
//         }
//     )
//     .catch((error) => {
//         console.log(error);
//     });
