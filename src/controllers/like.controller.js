import mongoose, { isValidObjectId } from 'mongoose';
import { Like } from '../models/like.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';
import { Video } from '../models/video.model.js';

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // Extract videoId from URL parameters

  // Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid video id');
  }
  if (!isValidObjectId(req.user._id)) {
    throw new ApiError(400, 'Invalid user id');
  }

  // Check if the user has already liked the video
  const alreadyLiked = await Like.findOne({
    video: videoId, // Reference to the video
    likeBy: req.user?._id, // Reference to the logged-in user
  });

  if (alreadyLiked) {
    // If already liked, remove the like
    await Like.findByIdAndDelete(alreadyLiked._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: false }, 'Video unliked successfully')
      );
  }
  // If not liked, create a new like
  const createLike = await Like.create({
    video: videoId,
    likeBy: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { createLike, isLiked: true },
        'Video liked successfully'
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, 'Invalid comment id');
  }
  const likedAready = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });
  console.log(likedAready, 'likedAready');
  if (likedAready) {
    await Like.findByIdAndDelete(likedAready?._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isLike: false },
          'comment like toggled successfully false'
        )
      );
  }
  const createLike = await Like.create({
    comment: commentId,
    likeBy: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { createLike, isLike: true },
        'comment like toggled successfully true?'
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, 'Invalid tweet id');
  }

  const alreadyTweet = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyTweet) {
    await Like.findByIdAndDelete(alreadyTweet?._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { tweetId, isLike: false },
          'tweet like toggled successfully'
        )
      );
  }

  const createLike = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { createLike, isLike: true },
        'tweet like toggled successfully'
      )
    );
});
const getLikedVideos = asyncHandler((req, res) => {
  const likeVideoAggegate = Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'video',
        foreignField: '_id',
        as: 'likeVideo',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'ownerDetails',
            },
          },
          {
            $unwind: '$ownerDetails',
          },
        ],
      },
    },
    {
      $unwind: '$likeVideo',
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likeVideo: {
          _id: 1,
          'videoFile.url': 1,
          'thumbnail.url': 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            'avatar.url': 1,
            fullName: 1,
            'avatar.url': 1,
          },
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { likeVideoAggegate },
        'liked videos fetched successfully'
      )
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
