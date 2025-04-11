import mongoose, { isValidObjectId } from 'mongoose';
import { Comment } from '../models/comment.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import { Like } from '../models/like.model.js';

const getAllComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, 'videoId is required');
  }
  const { page = 1, limit = 10 } = req.query;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }
  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    {
      $lookup: {
        from: 'likes',
        localField: '_id',
        foreignField: 'comment',
        as: 'likes',
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: '$likes',
        },
        owner: {
          $first: '$owner',
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, '$likes.likeBy'] },
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
        createdAt: 1,
        likesCount: 1,
        owner: {
          fullName: 1,
          username: 1,
          'avatar.url': 1,
        },
        isLiked: 1,
      },
    },
  ]);
  const Options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const comments = await Comment.aggregatePaginate(commentAggregate, Options);

  return res.status(200).json(
    new ApiResponse({
      statusCode: 200,
      comments,
      message: 'Comments fetched successfully',
    })
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, 'content is required');
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }
  if (!isValidObjectId(req.user._id)) {
    throw new ApiError(400, 'Invalid user id');
  }
  const createComment = await Comment.create({
    content,
    video: video._id,
    owner: req.user._id,
  });
  if (!createComment) {
    throw new ApiError(400, 'Comment not created');
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createComment, 'Comment created successfully'));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, 'content is required');
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not allowed to update this comment');
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    comment?._id,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  if (!updatedComment) {
    throw new ApiError(400, 'Comment not updated');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, 'Comment updated successfully'));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comments = await Comment.findById(commentId);
  if (!comments) {
    throw new ApiError(404, 'Comment not found');
  }
  if (comments.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not allowed to delete this comment');
  }

  await Comment.findByIdAndDelete(commentId);
  await Like.deleteMany({ comment: commentId, likedBy: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Comment deleted successfully'));
});

export { getAllComments, addComment, updateComment, deleteComment };
