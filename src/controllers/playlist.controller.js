import mongoose, { isValidObjectId } from 'mongoose';
import { Playlist } from '../models/playlist.model.js';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (name === '' || description === '') {
    throw new ApiError(400, 'name and description are required');
  }
  const user = req.user; // req.user is set in the token middleware
  if (!isValidObjectId(user._id)) {
    throw new ApiError(400, 'Invalid userId format');
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: user._id,
  });
  if (!playlist) {
    throw new ApiError(400, 'Unable to create playlist');
  }
  return res
    .status(201)
    .json(new ApiResponse(201, playlist, 'Playlist created successfully'));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { name, description, video: videoId } = req.body;
  const { playlistId } = req.params;

  // Validate input paremater
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid playlist id');
  }

  if (!name || !description) {
    throw new ApiError(400, 'name and description are required');
  }

  // validate the user.req
  const user = req.user;
  if (!isValidObjectId(user)) {
    throw new ApiError(400, 'Invalid user id');
  }

  // fetch the playList and valid ownership
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }
  if (playlist.owner.toString() !== user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to update this playlist');
  }

  // valid video id if found
  if (videoId) {
    if (!Array.isArray(videoId)) {
      throw new ApiError(400, 'Video must be array of valid ids ');
    }
    for (const video of videoId) {
      if (!isValidObjectId(video)) {
        throw new ApiError(400, `Invalid video id ${video}`);
      }
    }
  }

  // update the playList
  const updatedPlaylist = await Playlist.findByIdAndUpdate(playlist, {
    $set: {
      name,
      description,
      videos: videoId || playlist.videos,
    },
  });
  if (!updatedPlaylist) {
    throw new ApiError(400, 'Unable to update playlist in the database');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, 'Playlist updated successfully')
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user id');
  }
  const user = await User.findById(userId);
  if (user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to view this playlist');
  }
  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'videos',
        foreignField: '_id',
        as: 'videos',
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: '$videos',
        },
        totalViews: {
          $sum: '$videos.views',
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: 1,
        updatedAt: 1,
      },
    },
  ]);
  if (!playlist) {
    throw new ApiError(404, 'Playlists not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, 'Playlists fetched successfully'));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid playlist id');
  }

  const playList = await Playlist.findById(playlistId);
  if (!playList) {
    throw new ApiError(404, 'Playlists not found');
  }
  const playListVideo = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'videos',
        foreignField: '_id',
        as: 'videos',
      },
    },
    {
      $match: {
        'videos.isPublished': true,
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
      $addFields: {
        totalVideos: {
          $size: '$videos',
        },
        totalViews: {
          $sum: '$videos.views',
        },
        owner: {
          $first: '$owner',
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        video: {
          _id: 1,
          'videoFile.url': 1,
          'thumbnail.url': 1,
          title: 1,
          description: 1,
          duration: 1,
          view: 1,
          owner: {
            username: 1,
            'avatar.url': 1,
            fullName: 1,
          },
        },
      },
    },
  ]);

  if (!playListVideo) {
    throw new ApiError(404, 'failed to fetch the playlist from database');
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, playListVideo, 'Playlists fetched successfully')
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;
  //validate the playlist
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid playlist id or video id');
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, 'Video not found');
  }
  if (
    playlist.owner.toString() &&
    !video.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(400, 'You are not authorized to add this video');
  }
  const addVideoToPlaylist = await Playlist.findByIdAndUpdate(playlist?._id, {
    $addToSet: {
      videos: videoId,
    },
  });
  if (!addVideoToPlaylist) {
    throw new ApiError(400, 'Unable to add video to playlist');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, addVideoToPlaylist, 'Video added successfully'));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, 'Invalid playlist id or video id');
  }
  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);
  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }
  if (
    playlist.owner.toString() &&
    !video.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(404, 'You are not authorized to remove this video');
  }
  const removeVideoFromPlaylist = await Playlist.findByIdAndUpdate(
    playlist?._id,
    {
      $pull: {
        videos: videoId,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        removeVideoFromPlaylist,
        'Video removed successfully'
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, 'Invalid playlist id');
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, 'Playlist not found');
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to delete this playlist');
  }

  const deletePlaylist = await Playlist.findByIdAndDelete(playlistId);
  if (!deletePlaylist) {
    throw new ApiError(400, 'Unable to delete playlist in the database');
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, deletePlaylist, 'Playlist deleted successfully')
    );
});

export {
  createPlaylist,
  updatePlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
};
