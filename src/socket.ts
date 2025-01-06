import { Server, Socket } from 'socket.io';
import { prisma } from '../prisma/client';

// Track active socket connections
const activeSockets = new Set<Socket>();
const activeUsers = new Map<string, string>(); // userId -> chatId

export function initializeSocket(server: any) {
    const io = new Server(server, {
        cors: {
            origin: '*', // Allow all origins for now, restrict later if needed
            methods: ['GET', 'POST'],
        },
    });

    // Handle socket connections
    io.on('connection', (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);
        activeSockets.add(socket); // Track the socket connection

        // Handle joining a chat room
        socket.on('joinChat', async ({ chatId, userId }) => {
            try {
                activeUsers.set(userId, chatId);

                // Verify user's membership in chat
                const chat = await prisma.chat.findFirst({
                    where: {
                        id: chatId,
                        members: {
                            some: { userId },
                        },
                    },
                });

                if (!chat) {
                    socket.emit('error', { message: 'Access denied or chat not found.' });
                    return;
                }

                socket.join(chatId);
                console.log(`User ${userId} joined chat ${chatId}`);
                socket.to(chatId).emit('userJoined', { userId, chatId });
            } catch (error) {
                console.error('Error joining chat:', error);
                socket.emit('error', { message: 'Failed to join chat.' });
            }
        });

        // Fetch chat messages
        socket.on('fetchMessages', async ({ chatId }) => {
            try {
                const messages = await prisma.message.findMany({
                    where: { chatId },
                    orderBy: { createdAt: 'asc' },
                    include: { sender: true },
                });

                socket.emit('chatHistory', messages);
            } catch (error) {
                console.error('Error fetching messages:', error);
                socket.emit('error', { message: 'Failed to fetch messages.' });
            }
        });

        // Send a message
        socket.on('sendMessage', async ({ chatId, senderId, content }) => {
            try {
                const message = await prisma.message.create({
                    data: { chatId, senderId, content },
                    include: { sender: true },
                });

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

                // Notify users who are not in the chat
                const chatMembers = await prisma.chatMember.findMany({ where: { chatId } });
                chatMembers.forEach((member) => {
                    if (member.userId !== senderId && activeUsers.get(member.userId) !== chatId) {
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
            activeSockets.delete(socket); // Remove from active sockets
        });
    });

    return io;
}

// Graceful shutdown for sockets
export async function shutdownSockets() {
    console.log('Shutting down sockets...');
    activeSockets.forEach((socket) => socket.disconnect(true)); // Disconnect all sockets
}
