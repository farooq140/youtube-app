import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

//routes import
import userRouter from './routers/user.router.js';
import videoRouter from './routers/video.routes.js';
import likeRouter from './routers/like.routes.js';
import playlistRouter from './routers/playlist.routes.js';
import subscriptionRouter from './routers/subscription.routes.js';
import tweetRouter from './routers/tweet.routes.js';
import commentRouter from './routers/comment.routes.js';

//routes declaration
app.use('/api/v1/user', userRouter);
app.use('/api/v1/video', videoRouter);
app.use('/api/v1/like', likeRouter);
app.use('/api/v1/playlist', playlistRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/tweet', tweetRouter);
app.use('/api/v1/comment', commentRouter);

export default app;
