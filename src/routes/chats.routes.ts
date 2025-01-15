import express, { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { clerkClient, requireAuth } from '@clerk/express';

const router = express.Router();


// Utility to sync user from Clerk to the database
const syncUser = async (clerkId: string) => {
    // Check if the user already exists in the database
    let user = await prisma.user.findUnique({
        where: { id: clerkId },
    });

    // If user doesn't exist, fetch details from Clerk and create in DB
    if (!user) {
        const clerkUser = await clerkClient.users.getUser(clerkId);

        if (!clerkUser) {
            throw new Error('User not found in Clerk');
        }

        // Create user in the database
        user = await prisma.user.create({
            data: {
                id: clerkUser.id, // Clerk ID
                name: clerkUser.fullName || 'Unknown User',
                email: clerkUser.emailAddresses[0]?.emailAddress || '', // Use first email
                StudenthousingId: 1, // Assign default building or update as needed
            },
        });
    }

    return user;
};

// Create or fetch a private chat
// Example: routes/chat.ts

// routes/chats.ts
// POST /chats/start
router.post('/start', async (req: Request, res: Response): Promise<any> => {
    const { userId1, userId2, productData } = req.body; 
    // `productData` might be something like:
    // {
    //   productId: 123,
    //   title: "Winter Boots",
    //   price: 10,
    //   imageUrl: "https://...",
    //   userNote: "Is this still available?"
    // }

    try {
        // (Optional) Sync or verify users from Clerk
        await syncUser(userId1);
        await syncUser(userId2);

        // 1) Check if a 1-on-1 chat already exists
        let chat = await prisma.chat.findFirst({
            where: {
                isGroup: false,
                members: {
                    some: { userId: userId1 },
                },
                AND: {
                    members: {
                        some: { userId: userId2 },
                    },
                },
            },
            include: { members: true },
        });

        let isNew = false;
        if (!chat) {
            isNew = true;
            chat = await prisma.chat.create({
                data: {
                    isGroup: false,
                    members: {
                        create: [
                            { userId: userId1 },
                            { userId: userId2 },
                        ],
                    },
                },
                include: { members: true },
            });
        }

        // 2) If productData is present, create a "productCard" message immediately
        //    We'll store the entire object in `content` as JSON, and set type="productCard"
        if (productData) {
            await prisma.message.create({
                data: {
                    chatId: chat.id,
                    senderId: userId1,  // who is sending
                    type: 'productCard', 
                    content: JSON.stringify(productData), // store as JSON
                },
            });
        }

        // Return minimal response with "chatId"
        return res.status(200).json({
            chatId: chat.id,
            isNew,
        });
    } catch (error) {
        console.error('Error starting chat:', error);
        return res.status(500).json({ error: 'Failed to start chat.' });
    }
});


  
  


// Fetch all chats for a specific user
router.get('/user/:userId', async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.params;

    try {
        // Ensure the user exists in the database
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch all chats where the user is a member
        const chats = await prisma.chat.findMany({
            where: {
                members: {
                    some: { userId },
                },
            },
            include: {
                members: {
                    include: {
                        user: true, // Include user details for each member
                    },
                },
                messages: {
                    take: 1, // Include the latest message
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: {
                createdAt: 'desc', // Sort by most recent activity
            },
        });

        res.status(200).json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Failed to fetch chats.' });
    }
});

// Fetch a specific chat by ID
router.get('/:chatId', async (req: Request, res: Response): Promise<any> => {
    const { chatId } = req.params;

    try {
        // Fetch chat details
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                members: {
                    include: {
                        user: true, // Include user details for members
                    },
                },
                messages: {
                    orderBy: { createdAt: 'asc' }, // Sort messages in ascending order
                    include: {
                        sender: true, // Include sender details for each message
                    },
                },
            },
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.status(200).json(chat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ error: 'Failed to fetch chat.' });
    }
});



// Join Chat Endpoint
router.post('/join', async (req, res): Promise<any> => {
    try {
        const { userId } = req.auth; // Clerk user ID from auth middleware
        console.log(userId);
        const { studenthousingId } = req.body; // Passed in body during onboarding

        // Find the studenthouse and its chat ID
        const housing = await prisma.studenthousing.findUnique({
            where: { id: studenthousingId },
        });

        if (!housing || !housing.chatId) {
            return res.status(404).json({ message: 'Student housing not found or no chatroom exists' });
        }

        // Check if user is already a member
        const existingMember = await prisma.chatMember.findFirst({
            where: {
                chatId: housing.chatId,
                userId: userId!,
            },
        });

        if (existingMember) {
            return res.status(400).json({ message: 'User already a member of this chatroom' });
        }

        // Add user as a member to the chatroom
        await prisma.chatMember.create({
            data: {
                chatId: housing.chatId,
                userId: userId!,
                role: 'member', // Default role
            },
        });

        return res.json({ message: 'Successfully joined chatroom!' });
    } catch (error) {
        console.error('Error joining chatroom:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


export default router;
