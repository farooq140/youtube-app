import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import ApiError from "./apiError.js";

 // Configuration
 cloudinary.config({ 
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
     api_key: process.env.CLOUDINARY_API_KEY, 
     api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
 });

const uploadOnCloudinary=async(localFilePath)=>{
     try{
          if(!localFilePath) return new ApiError(404, "could not find the local file path")
          //upload the file on cloudinary
          const uploadResult=await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
          //file has been succcessfuly uploaded
          console.log("cloudinary.js",uploadResult);
           fs.unlinkSync(localFilePath)
          return uploadResult


     }catch(err)
     {
          fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload operation got filed
         console.log(err)
         return null
     }
}


 export {uploadOnCloudinary}
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