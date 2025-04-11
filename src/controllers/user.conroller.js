import { User } from '../models/user.model.js';
import { v2 as cloudinary } from 'cloudinary';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import {
  uploadOnCloudinary,
  extractPublicIdFromCloudinaryUrl,
} from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccesssToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, 'something went wrong while generating tokens');
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  //check  validation
  // check if email and username is unique
  //check for image exit check for aftar
  //updoad them to cloudanary
  //create a new user object
  //remove password and refresh token fields from response
  // check for user creation
  //return res

  const { username, email, password, fullName } = req.body;
  if (
    [username, email, password, fullName].some((field) => field.trim() === '')
  ) {
    throw new ApiError(400, `all fields is required `);
  }

  const exitedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (exitedUser) {
    throw new ApiError(409, 'User already exists  ');
  }

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  } else {
    throw new ApiError(404, 'Avatar is required');
  }
  let avatarFileValidate = req.files.avatar[0].mimetype.split('/')[0];
  console.log('filePart', avatarFileValidate);
  if (avatarFileValidate.trim() !== 'image') {
    throw new ApiError(422, 'Invalid file type. Only images are allowed.');
  }

  // const coverImageLocalPath=req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
    let coverImageFileValidate = req.files.coverImage[0].mimetype.split('/')[0];
    if (coverImageFileValidate.trim() !== 'image') {
      throw new ApiError(422, 'Invalid file type. Only images are allowed.');
    }
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(404, 'Avatar file failed to upload');
  }
  const user = await User.create({
    fullName,
    username,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  });

  const createUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  if (!createUser) {
    throw new ApiError(500, 'User creation failed');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createUser, 'User created successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
  // req.body exccess username,email
  //match it with db
  // match the this user password with db user password
  //generate the tokens
  //sent cookies
  //login user

  const { username, email, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, 'Username or email is required');
  }
  if (!password) {
    throw new ApiError(400, 'Password is required');
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'user password is Invalid ');
  }
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshTokens(user._id);

  const loginUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );

  const Options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, Options)
    .cookie('refreshToken', refreshToken, Options)
    .json(
      new ApiResponse(
        200,
        { user: loginUser, accessToken, refreshToken },
        'User logged in successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //exccess  login req,param tokens
  // user exit
  // access token refreshToken===""
  // user logout

  const user = await User.findByIdAndUpdate(
    { _id: req.user._id },
    {
      $set: { refreshToken: '' },
    },
    { new: true }
  );

  const Options = {
    httpOnly: true,
    secure: true,
  };
  console.log('logout.js users  ', user, Options);
  return res
    .status(200)
    .clearCookie('accessToken', '', Options)
    .clearCookie('refreshToken', '', Options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const refreshAssessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incommingRefreshToken) {
    throw new ApiError(401, 'unauthorized request');
  }
  console.log(
    'refreshAssessToken incommingRefreshToken',
    incommingRefreshToken,
    req.cookies
  );
  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(404, 'Invalid refresh token');
    }

    if (incommingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, 'refresh token is invalid or expired  ');
    }
    // if thing ok generate  token check option
    const Options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshTokens(user._id);
    console.log('refresh-token', user, accessToken, refreshToken);
    return res
      .status(200)
      .cookie('accessToken', accessToken, Options)
      .cookie('refreshToken', refreshToken, Options)
      .json(
        new ApiResponse(
          200,
          { user, accessToken, refreshToken },
          'User access token refreshed successfully'
        )
      );
  } catch (err) {
    throw new ApiError(401, err?.message || 'Invalid refresh token');
  }
});
const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!(oldPassword && newPassword)) {
    throw new ApiError(400, 'both new and old password are required');
  }
  if (oldPassword === newPassword) {
    throw new ApiError(400, 'New password cannot be same as old password');
  }
  const user = await User.findById(req.user._id);
  const validatePassword = await user.isPasswordCorrect(oldPassword);
  if (!validatePassword) {
    throw new ApiError(400, 'Invalid old password');
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'User password updated successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'user fetched successfully'));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, username, email } = req.body;
  if (!(fullName || username || email)) {
    throw new ApiError(400, 'At least one field is required');
  }
  const existingUser = await User.findOne({
    //this is for like.condition
    $or: [{ username }, { email }],
    _id: { $ne: req.user._id },
  });

  if (existingUser) {
    // Determine which field caused the conflict
    if (existingUser.username === username) {
      throw new ApiError(409, 'Username already exists');
    }
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email already exists');
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { fullName, username, email },
    },
    { new: true }
  ).select('-password -refreshToken');
  // if (existingUser !== user) {
  //   throw new ApiError(409, 'User already exists');
  // }
  console.log(
    'updateAccountDetails existingUser===user',
    existingUser?._id === user?._id,
    existingUser,
    user
  );
  return res
    .status(200)
    .json(new ApiResponse(200, user, 'user updated successfully'));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  console.log('cheack the file', req.file, 'req.file is file good??');
  let avatarLocalPath;
  if (req.file) {
    avatarLocalPath = req.file?.path;
  } else {
    throw new ApiError(404, 'Avatar is required');
  }

  // check if the avatar file is in correct format
  let avatarFileValidate = req.file?.mimetype.split('/')[0];
  console.log('filePart', avatarFileValidate);
  if (avatarFileValidate.trim() !== 'image') {
    throw new ApiError(422, 'Invalid file type. Only images are allowed.');
  }
  console.log(avatarFileValidate, 'avatarFileValidate');
  const user = await User.findById(req.user._id);
  // delete the old image as assignment after updateAvtar
  const oldAvatarUrl = user.avatar;
  // http://res.cloudinary.com/dd3zllxsr/image/upload/v1742450753/xsozkveismtbtyxbnbxz.jpg
  console.log(oldAvatarUrl, 'old avtar image');

  const newAvatar = await uploadOnCloudinary(avatarLocalPath);
  if (!newAvatar.url) {
    throw new ApiError(400, ' error upon uploading avatar');
  }
  const updateAvatar = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: newAvatar.url },
    },
    { new: true }
  ).select('-password -refreshToken');
  if (oldAvatarUrl && oldAvatarUrl !== newAvatar.url) {
    // destory old image
    try {
      // Extract the public ID from the old avatar URL
      const publicId = extractPublicIdFromCloudinaryUrl(oldAvatarUrl);
      console.log('Extracted public ID:', publicId);
      await cloudinary.uploader.destroy(publicId);
      console.log('Old avatar deleted successfully:', oldAvatarUrl);
    } catch (error) {
      console.error('Error deleting old avatar from Cloudinary:', error);
    }
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updateAvatar, 'User avatar updated successfully')
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  console.log('user.controller.js coverImage updateUserCoverImage', req?.file);
  const user = await User.findById(req.user._id);
  let oldCoverImageUrl;
  if (user.coverImage !== '') {
    oldCoverImageUrl = user.coverImage;
  }
  let coverImageLocalPath;
  if (req.file) {
    coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw new ApiError(404, 'coverImage is required');
    }
  }
  let coverImageFileValidate = req.file?.mimetype.split('/')[0];
  console.log('filePart', coverImageFileValidate);
  if (coverImageFileValidate.trim() !== 'image') {
    throw new ApiError(422, 'Invalid file type. Only images are allowed.');
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, ' error upon uploading avatar');
  }
  const updateCoverImage = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select('-password -refreshToken');
  if (oldCoverImageUrl && oldCoverImageUrl !== coverImage.url) {
    try {
      const publicId = extractPublicIdFromCloudinaryUrl(oldCoverImageUrl);
      console.log('Extracted public ID:', publicId);
      await cloudinary.uploader.destroy(publicId);
      console.log('Old avatar deleted successfully:', oldCoverImageUrl);
    } catch (err) {
      console.error('Error deleting old coverImage from Cloudinary:', err);
    }
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updateCoverImage,
        'User coverImage updated successfully'
      )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username.trim()) {
    throw new ApiError(400, 'username is required');
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers',
      },
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subcriber',
        as: 'subscribedTo',
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: '$subscribers',
        },
        channelsSubscribedToCount: {
          $size: '$subscribedTo',
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, '$subscribers.subcriber'],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        isSubscribed: 1,
        channelsSubscribedToCount: 1,
        subscribersCount: 1,
      },
    },
  ]);
  console.log(channel, 'channel????');
  if (channel?.length == 0) {
    throw new ApiError(404, 'channel does not exit');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], 'user channel featch successfully'));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  let user;
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      throw new ApiError(404, 'Invalid user ID');
    }
    user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: 'videos',
          localField: 'watchHistory',
          foreignField: '_id',
          as: 'watchHistory',
          pipeline: [
            {
              $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1,
                      coverImage: 1,
                      watchHistory: 1,
                    },
                  },
                  {
                    $addFields: {
                      owner: {
                        $first: '$owner',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    // handle case when user is not found
    if (!user[0].watchHistory || user[0].watchHistory === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            user[0].watchHistory,
            'user watch history is empty'
          )
        );
    }
  } catch (err) {
    console.log(err, 'error in getWatchHistory');
    throw new ApiError(500, 'Internal server error');
  }
  console.log(user[0].watchHistory[0]?.title, 'user watch history');

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        'user watch history fetched successfully'
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAssessToken,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
