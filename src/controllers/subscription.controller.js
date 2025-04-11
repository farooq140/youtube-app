import mongoose, { isValidObjectId } from 'mongoose';
import { Subscription } from '../models/subscription.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';

const toggleSubcription = asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  const userId = req.user._id; //get the userId from the reqest object

  //check if the channelId is valid or && userId
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, 'Invalid channelId format');
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid userId format');
  }

  // check if the subscription is already exits
  const subscription = await Subscription.findOne({
    channel: channelId,
    subcriber: userId,
  });

  let response;
  if (subscription) {
    //delete the subscription
    await Subscription.findByIdAndDelete(subscription._id);
    response = {
      status: 200,
      data: {
        isSubscribed: false,
      },
      message: 'Unsubscribed successfully',
    };
  } else {
    //create the subscription
    await Subscription.create({
      channel: channelId,
      subcriber: userId,
    });
    response = {
      status: 200,
      data: {
        isSubscribed: true,
      },
      message: 'Subscribed successfully',
    };
  }

  return res.status(response.status).json(new ApiResponse(response));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  let { channelId } = req.params;
  const user = req.user._id;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, 'Invalid channelId format');
  }
  if (!isValidObjectId(user)) {
    throw new ApiError(400, 'Invalid userId format');
  }
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: channelId,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'subcriber',
        foreignField: '_id',
        as: 'subscriber',
        pipeline: [
          {
            $lookup: {
              from: 'subscriptions',
              localField: '_id',
              foreignField: 'channel',
              as: 'subscribedToSubscriber',
            },
          },
          {
            $addFields: {
              subscriberToSubscriber: {
                $cond: {
                  if: { $in: [channelId, '$subscribedToSubscriber.subcriber'] },
                  then: true,
                  else: false,
                },
              },
              subscribersCount: {
                $size: '$subscribedToSubscriber',
              },
            },
          },
        ],
      },
    },
    {
      $unwind: '$subscriber',
    },
    {
      $project: {
        _id: 1,
        username: 1,
        fullName: 1,
        'avatar.url': 1,
        subscriberToSubscriber: 1,
        subscribersCount: 1,
      },
    },
  ]);
  if (!subscribers || subscribers.length === 0) {
    throw new ApiError(404, 'No subscribers found');
  }
  return res.status(200).json(
    new ApiResponse({
      status: 200,
      data: subscribers,
      message: 'Subscribers fetched successfully',
    })
  );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, 'Invalid channelId format');
  }
  const subscriberChannels = await Subscription.aggregate([
    {
      $match: {
        subcriber: channelId,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'channel',
        foreignField: '_id',
        as: 'subscribedChannel',
        pipeline: [
          {
            $lookup: {
              from: 'videos',
              localField: '_id',
              foreignField: 'owner',
              as: 'videos',
            },
          },
          {
            $addField: {
              latestVideo: {
                $last: '$videos',
              },
            },
          },
        ],
      },
    },
    {
      $unwind: '$subscribedChannel',
    },
    {
      $project: {
        _id: 0,
        username: 1,
        fullName: 1,
        'avatar.url': 1,
        latestVideo: {
          _id: 0,
          'videoFile.url': 1,
          'thumbnail.url': 1,
          owner: 1,
          title: 1,
          description: 1,
          createdAt: 1,
          views: 1,
        },
      },
    },
  ]);
  if (!subscriberChannels || subscriberChannels.length === 0) {
    throw new ApiError(404, 'No subscribed channels found');
  }

  return res.status(200).json(
    new ApiResponse({
      status: 200,
      data: subscriberChannels,
      message: 'Subscribed channels fetched successfully',
    })
  );
});
export { toggleSubcription, getUserChannelSubscribers, getSubscribedChannels };
