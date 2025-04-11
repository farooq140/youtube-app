import mongoose from 'mongoose';

const TweetSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'content is required'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model('Tweet', TweetSchema);
