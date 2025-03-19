import mongoose, { connect } from "mongoose";
import {DB_NAME} from "../constants.js"

 const connectDB=async()=>{
     try{
          const connect=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
          console.log(`mongoose connection dbhost ${connect.connection.host}`)
     }catch(err){
          console.log("Mongoose connection error",err);
          process.exit(1)
     
     }
}
export default connectDB;