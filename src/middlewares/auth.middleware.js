

import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
export const verifyJwt= asyncHandler(async(req,_,next)=>{

     try{
          const token=await req.cookies?.accessToken||req.header("Authorization").replace("Bearer ","")
          if(!token){
          throw new ApiError(401,"Unauthorized request")
          }
          const decoded=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
          const user=await User.findById(decoded?._id).select("-password -refreshToken" );

          if(!user){
     
          throw new ApiError(401,"invalid access token")
          }
          req.user=user
          console.log("auth.middleware.js",user)
          next()
     }catch(err){
          throw new ApiError(401,err.message||"invalid access token")
     }     
})