import express, { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { clerkClient } from '@clerk/express';

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
                buildingId: 1, // Assign default building or update as needed
            },
        });
    }

    return user;
};

// Create or fetch a private chat
router.post('/start', async (req: Request, res: Response) => {
    const { userId1, userId2 } = req.body;

    try {
        // Ensure both users exist in the database
        await syncUser(userId1); // Sync first user
        await syncUser(userId2); // Sync second user

        // Check if chat already exists
        let chat = await prisma.chat.findFirst({
            where: {
                isGroup: false,
                members: {
                    every: {
                        userId: { in: [userId1, userId2] },
                    },
                },
            },
            include: {
                members: true,
            },
        });

        // Create chat if it doesn't exist
        if (!chat) {
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
                include: {
                    members: true,
                },
            });
        }

        res.status(200).json(chat);
    } catch (error) {
        console.error('Error starting chat:', error);
        res.status(500).json({ error: 'Failed to start chat.' });
    }
});

export default router;
