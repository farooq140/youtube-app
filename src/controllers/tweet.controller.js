import mongoose, { isValidObjectId } from 'mongoose';
import { Tweet } from '../models/tweet.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';
import { Like } from '../models/like.model.js';
import { Comment } from '../models/comment.model.js';

const CreateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  console.log(content, 'content??');
  if (!content || content.trim() === '') {
    throw new ApiError(400, 'Content is required');
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const createTweet = await Tweet.create({
    content,
    owner: user._id,
  });
  if (!createTweet) {
    throw new ApiError(500, 'Failed to create tweet');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createTweet, 'Tweet created successfully'));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid userId');
  }

  const tweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'users',
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
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'tweet',
        as: 'likesDetails',
        pipeline: [
          {
            $project: {
              LikedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likeCounts: {
          $size: '$likesDetails',
        },
        ownerDetails: {
          $first: '$ownerDetails',
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user._id, '$likesDetails.LikedBy'] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        likeCounts: 1,
        ownerDetails: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!tweet) {
    throw new ApiError(404, 'Tweet not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, 'Tweets fetched successfully'));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, 'Invalid tweetId');
  }
  if (!content || content.trim() === '') {
    throw new ApiError(400, 'Content is required');
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, 'Tweet not found');
  }

  if (user._id.toString() !== tweet.owner.toString()) {
    throw new ApiError(403, 'You are not authorized to update this tweet');
  }

  const updateTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { $set: { content } },
    { new: true }
  );
  if (!updateTweet) {
    throw new ApiError(404, 'failed to update the tweet in the database');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updateTweet, 'Tweet updated successfully'));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, 'Invalid tweetId');
  }
  const user = await User.findById(req.user);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, 'Tweet not found');
  }

  if (user._id.toString() !== tweet.owner.toString()) {
    throw new ApiError(403, 'You are not authorized to delete this tweet');
  }

  const deleteTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deleteTweet) {
    throw new ApiError(404, 'failed to delete the tweet in the database');
  }
  // await Like.deleteMany({ tweet: tweetId, likedBy: req.user._id });
  // await Comment.deleteMany({ tweet: tweetId, owner: req.user._id });
  return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, 'Tweet deleted successfully'));
});

export { CreateTweet, getUserTweets, updateTweet, deleteTweet };
