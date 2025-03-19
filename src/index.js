import dotenv from "dotenv"
import connectDB from "./db/index.js";
import app from "./app.js"

dotenv.config({
     path: './.env'
 })

connectDB()
     .then(()=>{
          app.listen(process.env.PORT||8000,()=>{
              console.log( `server is running in port: ${process.env.PORT}`)
          })
     }

     )
.catch((err)=>{
     console.log(err,"mongoose db connection failed");
     }
          
     )

 

// ;(async()=>{
//      try{
//       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//       app.on("error",(err)=>{
//           console.log(err);
//       });        
//       app.listen(process.env.PORT,()=>{

//       });
//      }catch(err){
//           console.log(err);
//      }
//      }
// )()