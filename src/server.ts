import http from 'http';
import app from './app';
import { Server } from 'socket.io';
import { prisma } from '../prisma/client';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for now, restrict later if needed
        methods: ['GET', 'POST'],
    },
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);


    // Keep track of active chat rooms
    const activeUsers = new Map<string, string>(); // userId -> socketId


    // Handle joining a chat room
    socket.on('joinChat', async ({ chatId, userId }) => {
        try {

            activeUsers.set(userId, chatId);

            // Check if the user is a member of the chat
            const chat = await prisma.chat.findFirst({
                where: {
                    id: chatId,
                    members: {
                        some: {
                            userId: userId,
                        },
                    },
                },
            });

            if (!chat) {
                socket.emit('error', { message: 'Access denied or chat not found.' });
                return;
            }

            // Join the room
            socket.join(chatId);
            console.log(`User ${userId} joined chat ${chatId}`);

            // Broadcast to the room that a new user has joined
            socket.to(chatId).emit('userJoined', { userId, chatId });
        } catch (error) {
            console.error('Error joining chat:', error);
            socket.emit('error', { message: 'Failed to join chat.' });
        }
    });

    socket.on('fetchMessages', async ({ chatId }) => {
        try {
            // Fetch messages for the chat
            const messages = await prisma.message.findMany({
                where: { chatId },
                orderBy: { createdAt: 'asc' },
                include: {
                    sender: true, // Include sender info
                },
            });
    
            // Emit chat history back to the client
            socket.emit('chatHistory', messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            socket.emit('error', { message: 'Failed to fetch messages.' });
        }
    });

    // Handle sending a message
    socket.on('sendMessage', async ({ chatId, senderId, content }) => {
        try {
            // Save the message in the database
            const message = await prisma.message.create({
                data: {
                    chatId,
                    senderId,
                    content,
                },
                include: { sender: true },
            });

            // Emit the new message to everyone in the chat
            io.to(chatId).emit('newMessage', {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                createdAt: message.createdAt,
                sender: {
                    id: message.sender.id,
                    name: message.sender.name,
                },
            });

            // **Send notifications to users not in the chat room**
            const chatMembers = await prisma.chatMember.findMany({
                where: { chatId },
            });

            chatMembers.forEach((member) => {
                if (member.userId !== senderId && activeUsers.get(member.userId) !== chatId) {
                    // Notify users who are not currently in the chat
                    io.to(member.userId).emit('notifyMessage', {
                        chatId,
                        content,
                        senderName: message.sender.name,
                    });
                }
            });
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message.' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
