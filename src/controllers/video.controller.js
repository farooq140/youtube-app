import mongoose, { isValidObjectId, Query } from 'mongoose';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { v2 as cloudinary } from 'cloudinary';
import { Subscription } from '../models/subscription.model.js';
import {
  uploadOnCloudinary,
  extractPublicIdFromCloudinaryUrl,
} from '../utils/cloudinary.js';
import { Like } from '../models/like.model.js';

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // Initialize the aggregation pipeline
  const pipeline = [];
  console.log(userId, 'user id from the query');
  // Full-text search using MongoDB Atlas Search
  if (query) {
    pipeline.push({
      $search: {
        index: 'search-videos', // Ensure this index exists in MongoDB Atlas
        text: {
          query,
          path: ['title', 'description'], // Search only in title and description
        },
      },
    });
  }
  console.log('query I am in query many', query, pipeline);

  // Filter by userId if provided
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }
    pipeline.push({
      $match: { owner: new mongoose.Types.ObjectId(userId) },
    });
  }

  // Fetch only published videos
  pipeline.push({
    $match: { isPublished: true },
  });

  // Sorting logic
  if (sortBy && sortType) {
    if (!['asc', 'desc'].includes(sortType.toLowerCase())) {
      throw new ApiError(400, 'Invalid sort type. Use "asc" or "desc".');
    }
    pipeline.push({
      $sort: { [sortBy]: sortType.toLowerCase() === 'asc' ? 1 : -1 },
    });
  } else {
    // Default sorting by createdAt in descending order
    pipeline.push({
      $sort: { createdAt: -1 },
    });
  }

  // Lookup to fetch owner details
  pipeline.push(
    {
      $lookup: {
        from: 'users', // Collection name for users
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerDetails',
        pipeline: [
          {
            $project: {
              username: 1,
              'avatar.url': 1,
            },
          },
        ],
      },
    },
    {
      $unwind: '$ownerDetails', // Unwind the ownerDetails array
    }
  );

  // Pagination options
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  try {
    // Use aggregatePaginate with the pipeline
    const video = await Video.aggregatePaginate(pipeline, options);
    console.log('video pipline', video);
    console.log('query I am in query many', query, pipeline);

    return res
      .status(200)
      .json(new ApiResponse(200, { video }, 'Videos fetched successfully'));
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw new ApiError(500, 'Internal server error while fetching videos');
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  //  getiing the video title, description, video file, thumbnail from the request body
  //  check if the user is authenticated or not
  //  check if the video file and thumbnail are present or not
  //  check if the video file and thumbnail are valid or not
  //  upload the video file and thumbnail to cloudinary
  //  create a new video object and save it to the database
  //  return the response with the video object and success message
  const { title, description } = req.body;
  const user = req.user; // it is verfied by the cookeies
  if (!user) {
    throw new ApiError(401, 'unauthorized request');
  }
  if ([title, description].some((field) => field?.trim() === '')) {
    throw new ApiError(404, 'all the field are required');
  }
  let videoLocalpath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoLocalpath = req.files.videoFile[0].path;
  }
  if (!videoLocalpath) {
    throw new ApiError(404, 'video is required');
  }
  let thumbnailLocalpath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalpath = req.files.thumbnail[0].path;
  }
  if (!thumbnailLocalpath) {
    throw new ApiError(404, 'thumbnail is required');
  }

  // validate the video files
  let videoFileValidate = req.files.videoFile[0].mimetype.split('/')[0];
  console.log('filePart for video', videoFileValidate);
  if (videoFileValidate.trim() !== 'video') {
    throw new ApiError(422, 'Invalid file type. Only video are allowed.');
  }
  let thumbnailFileValidate = req.files.thumbnail[0].mimetype.split('/')[0];
  console.log('filePart for thumbnail', thumbnailFileValidate);
  if (thumbnailFileValidate.trim() !== 'image') {
    throw new ApiError(422, 'Invalid file type. Only images are allowed.');
  }

  const videoFile = await uploadOnCloudinary(videoLocalpath);
  if (!videoFile) {
    throw new ApiError(404, 'error upon uploading video ');
  }
  const fileDuration = videoFile.duration;
  const thumbnail = await uploadOnCloudinary(thumbnailLocalpath);
  if (!thumbnail) {
    throw new ApiError(404, 'error upon uploading thumbnail ');
  }
  const newVideo = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: user?._id,
    title,
    description,
    duration: fileDuration,
    isPublished: true,
  });
  // const videoUploded = await Video.findById(newVideo._id).populate('owner');
  const videoUploded = await Video.findById(newVideo._id);
  console.log('video uploded', videoUploded, newVideo, 'new video??? diff');
  if (!videoUploded) {
    throw new ApiError(404, 'error upon uploading video ');
  }
  console.log('get the name of the video uploded user', newVideo.owner);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { videoUploded, newVideo },
        'video uploaded successfully'
      )
    );
});
const getVideoById = asyncHandler(async (req, res) => {
  // get the video id from the request params ok
  //  check if the video id is valid or not  ok
  //DONE   check if the user id is valid or  ok
  // fetch the video details using aggration
  // check if the video is found or not
  // if the video is found then increment the views and update the watch history
  // if the video is not found then return the error message
  // return the response with the video object and success message

  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid video id');
  }
  const user = req.user; // it is verified by the cookies
  if (!user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, 'unauthorized Invalid userId');
  }
  //fetch video  details using aggration pipeline
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: 'likes', // TODO: join this with 'likes' collection
        localField: '_id',
        foreignField: 'video',
        as: 'likes', // TODO: store the likes in array
      },
    },
    {
      $lookup: {
        from: 'users', // join this with 'users' collection to get the owner details
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
        pipeline: [
          {
            $lookup: {
              from: 'subscriptions', //TODO join this with 'subscriptions' collection to get the subscribers details
              localField: '_id',
              foreignField: 'channel',
              as: 'subscribers',
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: '$subscribers', // couting the subscribers
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(user._id),
                      '$subscribers.subcriber',
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              'avatar.url': 1,
              subscribersCount: 1,
              isSubscribed: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: '$likes', //count the number of  likes
        },
        isLiked: {
          $cond: {
            if: {
              $in: [new mongoose.Types.ObjectId(user._id), '$likes.likedBy'],
            },
            then: true,
            else: false,
          },
        },
        owner: {
          $first: '$owner',
        },
      },
    },

    {
      $project: {
        'videoFile.url': 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);
  console.log('okkk', video, 'ok yar');

  //handle empty video
  if (!video || video.length === 0) {
    throw new ApiError(404, 'video not found');
  }

  // Increment views and update watch history
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: {
        views: 1, // Increment views field
      },
    },
    { new: true }
  );
  // update the user watch history
  const watchHistory = await User.findByIdAndUpdate(user?._id, {
    $addToSet: {
      watchHistory: videoId, // add the videoId to the watch history
    },
  });
  console.log(watchHistory, 'updated video details after incrementing views');

  return res
    .status(200)
    .json(
      new ApiResponse(200, { video: video[0] }, 'video fetched successfully')
    );
});

// update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  // getting the video id from the request params
  // check if the video id is valid or not
  // check if the user id is valid or not
  // get the video details from the request body
  // check if the video details are valid or not ensure that the video file and thumbnail are present or not
  // check if the video file and thumbnail are valid or not
  // upload the video file and thumbnail to cloudinary
  // update the video details in the database
  // return the response with the video object and success message
  console.log('cheack the file', req.file, 'req.files?????');
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid video id');
  }

  const user = req.user; // it is verified by the cookies
  if (!user || !isValidObjectId(req.user._id)) {
    throw new ApiError(401, 'unauthorized Invalid userId');
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'video not found');
  }
  console.log('video owner and user  id', video.owner, user._id);
  if (video.owner.toString() !== user._id.toString()) {
    throw new ApiError(403, 'you are not authorized to update this video');
  }

  // check if the video details
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === '')) {
    throw new ApiError(404, 'all the field are required');
  }

  console.log('thumbnailLocalpath', req.file.path);
  let thumbnailLocalpath = req.file.path;

  console.log('thumbnailLocalpath check', thumbnailLocalpath);
  if (!thumbnailLocalpath) {
    throw new ApiError(404, 'thumbnail is required');
  }
  // validate the thumbnnail files
  let thumbnailFileValidate = req.file.mimetype.split('/')[0];
  console.log('filePart for thumbnail', thumbnailFileValidate);
  if (thumbnailFileValidate.trim() !== 'image') {
    throw new ApiError(422, 'Invalid file type. Only images are allowed.');
  }
  // upload the thumbnail to cloudinary
  const thumbnail = await uploadOnCloudinary(thumbnailLocalpath);
  if (!thumbnail) {
    throw new ApiError(404, 'error upon uploading thumbnail ');
  }
  // update the video details in the database
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: thumbnail.url,
        title,
        description,
      },
    },
    { new: true }
  );
  if (!updatedVideo) {
    throw new ApiError(404, 'error upon updating video ');
  }

  // delete the old video and thumbnail from cloudinary
  console.log(video.thumbnail, 'old thumbnail url');
  const oldThumbnailUrl = video.thumbnail;
  const thumbnailPublicId = extractPublicIdFromCloudinaryUrl(oldThumbnailUrl);
  console.log(oldThumbnailUrl, 'old video url', thumbnailPublicId);
  await cloudinary.uploader.destroy(thumbnailPublicId);

  return res
    .status(200)
    .json(new ApiResponse(200, { updatedVideo }, 'video updated successfully'));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  console.log(videoId, 'video id from the params');
  if (!videoId) {
    throw new ApiError(400, 'video id is required');
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'video not found');
  }
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'you are not authorized to delete this video');
  }
  const thumbnailPublicId = extractPublicIdFromCloudinaryUrl(video.thumbnail);
  const videoPublicId = extractPublicIdFromCloudinaryUrl(video.videoFile);
  console.log(thumbnailPublicId, videoPublicId, 'public id of the video');
  if (!thumbnailPublicId || !videoPublicId) {
    throw new ApiError(404, 'error upon deleting video ');
  }
  const cloudanarythumbnailDeleted =
    await cloudinary.uploader.destroy(thumbnailPublicId);
  const cloudaryvideoDeleted = await cloudinary.uploader.destroy(videoPublicId);
  if (!(cloudanarythumbnailDeleted || cloudaryvideoDeleted)) {
    throw new ApiError(404, 'error upon deleting thumbnail ');
  }

  // delete the video from the database
  const videoDeleted = await Video.findByIdAndDelete(videoId);
  if (!videoDeleted) {
    throw new ApiError(404, 'error upon deleting video ');
  }

  //delete video likes
  // await Like.deleteMany({ video: videoId });
  // //delete video comments
  // await Comment.deleteMany({ video: videoId });
  // //delete video subscribers
  // await Subscription.deleteMany({ channel: videoId });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'video deleted successfully'));
});
const togglePublishStatus = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid video id');
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'video not found');
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'you are not authorized to publish the this video');
  }
  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { toggledVideoPublish },
        'video publish status toggled successfully'
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
