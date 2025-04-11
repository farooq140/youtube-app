import mongoose, { Schema } from 'mongoose';

const PlaylistSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
    },
    description: {
      type: String,
      required: [true, 'description is required'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    video: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Video',
      },
    ],
  },
  { timestamps: true }
);

export const Playlist = mongoose.model('Playlist', PlaylistSchema);
