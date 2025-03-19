import multer from "multer";

const storage = multer.diskStorage({
     destination: function (req, file, cb) {
       cb(null, './public/temp')
     },
     filename: function (req, file, cb) {
          //should update later in the project for now keeping it simple
     //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
       console.log(file) ;
       cb(null, file.originalname)
     }
   })
   
  export const upload = multer({ storage })