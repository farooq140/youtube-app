const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
          Promise.resolve(requestHandler(req,res,next))
          .catch((err)=>{next(err)})
     }
}
export default asyncHandler;

// const asyncHandler=(fn)=>async(req,res,next)=>{
// try{
//      fn(req,res,next)
// }catch(err){
//      res.status(err.code||500).json({
//           sucess:false,
//           message:err.message
//      })
// }
// }
