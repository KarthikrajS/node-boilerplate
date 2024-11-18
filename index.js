import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import amqp from 'amqplib';
import authRoutes from './routes/auth.js';
import { registerUser } from './controllers/userController.js';
import protectedRoute from './routes/protectedRoute.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON request body

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// RabbitMQ setup
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let channel, connection;

const connectRabbitMQ = async () => {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('user_events');
};

// Register routes
app.use('/api/auth', authRoutes);

app.use('/api/protected', protectedRoute);

// Publish to RabbitMQ after user registration
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Register user
    const user = await registerUser(name, email, password);

    // Publish to RabbitMQ
    channel.sendToQueue('user_events', Buffer.from(JSON.stringify({ event: 'USER_REGISTERED', user })));

    res.status(201).json({ message: 'User created', user });
});

// Listen to RabbitMQ events (e.g., sending welcome email)
const listenToEvents = () => {
    channel.consume('user_events', (msg) => {
        const data = JSON.parse(msg.content.toString());
        if (data.event === 'USER_REGISTERED') {
            console.log('New user registered:', data.user);
            // Simulate sending a welcome notification
            sendWelcomeNotification(data.user);
        }
        channel.ack(msg);
    });
};

// Simulate sending a welcome notification (e.g., email)
const sendWelcomeNotification = (user) => {
    console.log(`Sending welcome notification to ${user.name} (${user.email})`);
};

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, async () => {
    await connectRabbitMQ();
    listenToEvents();
    console.log(`Server running on port ${PORT}`);
});
