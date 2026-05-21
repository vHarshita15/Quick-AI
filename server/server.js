import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app = express();

await connectCloudinary();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

app.use(clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
}));

app.get('/', (req, res) => res.send('Server is Live!'));

app.use('/api/ai', aiRouter);
app.use('/api/user', userRouter);

app.use((err, req, res, next) => {
    console.error('[server] unhandled error', {
        message: err.message,
        stack: err.stack,
        name: err.name,
    });

    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed',
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('Server is running on port', PORT);
    });
}

export default app;
