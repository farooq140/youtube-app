import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('destination', file.mimetype);

    cb(null, './public/temp');
  },
  filename: function (req, file, cb) {
    //should update later in the project for now keeping it simple
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)

    console.log(file, 'multer file');

    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });
