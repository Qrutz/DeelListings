// socket.ts (or wherever you define initializeSocket)
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

  // SINGLE top-level connection handler
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string; // e.g. ?userId=xxx

    if (userId) {
      // Map user ID to socket ID, join personal room
      activeUsers.set(userId, socket.id);
      socket.join(userId);
      console.log(`User ${userId} connected and joined personal room`);
    }

    // 1) Handle joining a chat room
    socket.on('joinChat', async ({ chatId, userId }) => {
      try {
        activeUsers.set(userId, chatId);

        // Verify membership
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

    // 2) Fetch all messages for a given chat
    socket.on('fetchMessages', async ({ chatId }) => {
      try {
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            members: {
              include: {
                user: true,
              },
            },
            
            messages: {
              orderBy: { createdAt: 'asc' },
              include: { sender: true, 
                swap: {
                  include: {
                    listingA: true,
                    listingB: true,
                  },
                }
              
              },
            },
            
          },
        });

        if (!chat) {
          socket.emit('error', { message: 'Chat not found.' });
          return;
        }

        socket.emit('chatDetails', chat);
      } catch (error) {
        console.error('Error fetching chat details:', error);
        socket.emit('error', { message: 'Failed to fetch chat details.' });
      }
    });

    // 3) Fetch user’s active chats
    socket.on('fetchChats', async ({ userId }) => {
      try {
        const chats = await prisma.chat.findMany({
          where: {
            members: {
              some: { userId },
            },
          },
          include: {
            members: {
              include: {
                user: true,
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        socket.emit('chatList', chats);
      } catch (error) {
        console.error('Error fetching chats:', error);
        socket.emit('error', { message: 'Failed to fetch chats.' });
      }
    });

    // 4) Send a message (NOW inside the same connection block)
    socket.on('sendMessage', async (payload) => {
      try {
        const { chatId, senderId, content, type } = payload;

        // Create the message in DB
        const createdMsg = await prisma.message.create({
          data: {
            chatId,
            senderId,
            content,
            type,
          },
          include: { sender: true },
        });

        // Broadcast new message to everyone in the chat
        io.to(chatId).emit('newMessage', createdMsg);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

      // 5) ACCEPT SWAP (new event)
      socket.on('acceptSwap', async ({ swapId, userId, chatId }) => {
        try {
          // 1) Fetch the swap
          const swap = await prisma.swap.findUnique({ where: { id: swapId } });
          if (!swap) {
            socket.emit('error', { message: 'Swap not found.' });
            return;
          }
  
          // 2) Only the recipient can accept
          if (swap.recipientId !== userId) {
            socket.emit('error', { message: 'You are not the recipient of this swap.' });
            return;
          }
  
          // 3) Check if pending
          if (swap.status !== 'pending') {
            socket.emit('error', {
              message: `Cannot accept a swap with status: ${swap.status}`,
            });
            return;
          }
  
          // 4) Mark listings as swapped if you want
          //    e.g. await prisma.listing.update({ where: { id: swap.listingAId }, data: { status: 'SWAPPED' } });
          //         await prisma.listing.update({ where: { id: swap.listingBId }, data: { status: 'SWAPPED' } });
  
          // 5) Update the swap
          const updatedSwap = await prisma.swap.update({
            where: { id: swapId },
            data: { status: 'accepted' },
          });
  
          // 6) Possibly update the message in the chat that references the swap
          //    If your message schema references swapId, you might also do:
          //    await prisma.message.updateMany({ where: { swapId }, data: { ... } });
  
          // 7) Broadcast a "swapUpdated" event (or updated chat) to everyone
          //    so their chat UIs can reflect the new status
          io.to(chatId).emit('swapUpdated', updatedSwap);
  
          console.log(`User ${userId} accepted swap ${swapId}`);
        } catch (error) {
          console.error('Error accepting swap:', error);
          socket.emit('error', { message: 'Failed to accept swap.' });
        }
      });


      // 6) REJECT SWAP (new event)
      socket.on('declineSwap', async ({ swapId, userId, chatId }) => {
        try {
          // 1) Fetch the swap
          const swap = await prisma.swap.findUnique({ where: { id: swapId } });
          if (!swap) {
            socket.emit('error', { message: 'Swap not found.' });
            return;
          }
  
          // 2) Only the recipient can reject
          if (swap.recipientId !== userId) {
            socket.emit('error', { message: 'You are not the recipient of this swap.' });
            return;
          }
  
          // 3) Check if pending
          if (swap.status !== 'pending') {
            socket.emit('error', {
              message: `Cannot reject a swap with status: ${swap.status}`,
            });
            return;
          }
  
          // 4) Update the swap
          const updatedSwap = await prisma.swap.update({
            where: { id: swapId },
            data: { status: 'rejected' },
          });
  
          // 5) Broadcast a "swapUpdated" event (or updated chat) to everyone
          //    so their chat UIs can reflect the new status
          io.to(chatId).emit('swapUpdated', updatedSwap);
  
          console.log(`User ${userId} rejected swap ${swapId}`);
        } catch (error) {
          console.error('Error rejecting swap:', error);
          socket.emit('error', { message: 'Failed to reject swap.' });
        }
      });


    

    // 5) On disconnect
    socket.on('disconnect', () => {
      activeUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

// Optional graceful shutdown
export async function shutdownSockets() {
  console.log('Shutting down sockets...');
  activeSockets.forEach((socket) => socket.disconnect(true));
}
