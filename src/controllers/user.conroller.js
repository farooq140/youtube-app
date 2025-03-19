import { User } from "../models/user.model.js";
import asyncHandler from"../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import {uploadOnCloudinary} from"../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessTokenAndRefreshTokens=async(userId)=>{
     try{
          const user=await User.findById(userId)
           const accessToken=user.generateAccesssToken()
           const refreshToken=user.generateRefreshToken()

           user.refreshToken=refreshToken
           await user.save({validateBeforeSave:false})
           return {accessToken,refreshToken}


     }catch(err){
         throw new ApiError(500,"something went wrong while generating tokens")
     }
}
const registerUser=asyncHandler(async(req,res)=>{
     // get user details from frontend
     //check  validation
     // check if email and username is unique
     //check for image exit check for aftar
     //updoad them to cloudanary
     //create a new user object
     //remove password anf refresh token fields from response
     // check for user creation
     //return res

     const {username,email,password,fullName}=req.body;
     if([username,email,password,fullName].some((field)=>field?.trim()==="")){
          throw new ApiError(400,`${field} is required`)
     };
     const exitedUser= await User.findOne({
          $or:[{username},{email}]
     })
     if(exitedUser){
          throw new ApiError(409,"User already exists")
     }
     const avatarLocalPath=req.files?.avatar[0]?.path;
     console.log("user.controller",req.files)
     // const coverImageLocalPath=req.files?.coverImage[0]?.path;
     let coverImageLocalPath;
     if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
          coverImageLocalPath=req.files.coverImage[0].path;
     };

     if(!avatarLocalPath){
          throw new ApiError(404,"Avatar is required")
     }  
     const avatar=await uploadOnCloudinary(avatarLocalPath);
     const coverImage=await uploadOnCloudinary(coverImageLocalPath);
     if(!avatar){
          throw new ApiError(404,"Avatar is required")
     }
      const user=await User.create({
          fullName,
          username,
          email,
          password,
          avatar:avatar.url,
          coverImage:coverImage?.url||"",


      })

     const createUser=await User.findById(user._id).select("-password -refreshToken")
     if(!createUser){
          throw new ApiError(500,"User creation failed")
     }


     return res.status(201).json(
          new ApiResponse(201,createUser,"User created successfully")
     )
} )

const loginUser=asyncHandler(async(req,res)=>{
     // req.body exccess username,email 
     //match it with db
     // match the this user password with db user password
     //generate the tokens 
     //sent cookies
     //login user 
     
     const {username,email,password}=req.body;
     if(!(username|| email)){
          throw new ApiError(400,"Username or email is required")

     }
     if(!password){
          throw new ApiError(400,"Password is required")
     }
     const user=await User.findOne({
          $or:[{username},{email}]
     })
     if(!user){
          throw new ApiError(404,"User not found")
     }
     
     const isPasswordValid=await user.isPasswordCorrect(password)
     if(!isPasswordValid){
          throw new ApiError(401,"Invalid password")
     }
       const {accessToken,refreshToken}=await  generateAccessTokenAndRefreshTokens(user._id)

     const loginUser=await User.findById(user._id).select("-password -refreshToken")
     
     const Options={
          httpOnly:true,
          secure:true,
          
     }

     return res
               .status(200)
               .cookie("accessToken",accessToken,Options)
               .cookie("refreshToken",refreshToken,Options)
               .json(
                    new ApiResponse(200,
                         {user:loginUser,accessToken,
                              refreshToken},
                              "User logged in successfully"
                         )
     )
})


const logoutUser=asyncHandler(async(req,res)=>{
     //exccess  login req,param tokens
     // user exit 
     // access token refreshToken===""
     // user logout 
     await User.findByIdAndUpdate(
          req.user._id,
          {
               $set:{refreshToken:undefined},
               
               
          },
          {new:true}
     )
     const Options={
          httpOnly:true,
          secure:true,     
     }
     return res
               .status(200)
               .clearCookie("accessToken","",Options)
               .clearCookie("refreshToken","",Options)
               .json(
                    new ApiResponse(200,
                         {},
                         "User logged out successfully"
                         )
               )
})

const refreshAssessToken=asyncHandler(async(req,res)=>{
     const incommingRefreshToken=req.cookies?.refreshToken||req.body.refreshToken
     if(!incommingRefreshToken){
          throw new ApiError(401,"unauthorized request")
     }
     console.log("refreshAssessToken incommingRefreshToken",incommingRefreshToken,req.cookies)
    try{
          const decodedToken =jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
          const user=await User.findById(decodedToken?._id)
          if(!user){
               throw new ApiError(404,"Invalid refresh token")
          }
          // console.log("user.controller refreshAssessToken",user)
          if(incommingRefreshToken!==user.refreshToken){
               throw new ApiError(401,"refresh token is invalid or expired  ")
          }
          // if thing ok generate  token check option
          const Options={
               httpOnly:true,
               secure:true,     
          }
          const {accessToken,refreshToken}=await generateAccessTokenAndRefreshTokens(user._id)

          return res
          .status(200)
          .cookie("accessToken",accessToken,Options)
          .cookie("refreshToken",refreshToken,Options)
          .json(
               new ApiResponse(200,
                    {accessToken,refreshToken     },
                    "User access token refreshed successfully"
                    )
          )
    }catch(err)
    {
          throw new ApiError(401,err?.message||"Invalid refresh token")
    }

})


export {registerUser,
         loginUser,
         logoutUser,
         refreshAssessToken
}
