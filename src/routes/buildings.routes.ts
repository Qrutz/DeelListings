import express, { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { clerkClient } from '@clerk/express';

const router = express.Router();

// Get all buildings
router.get('/', async (req, res) => {
    try {
        const buildings = await prisma.studenthousing.findMany({include: {users: true}});
        res.status(200).json(buildings);
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({ error: 'Failed to fetch buildings.' });
    }
});

// Get a single building by ID
router.get('/:id', async (req, res): Promise<any> => {
    const { id } = req.params;

    try {
        const building = await prisma.studenthousing.findUnique({
            where: { id: parseInt(id) },
        });

        if (!building) {
            return res.status(404).json({ error: 'Building not found.' });
        }

        res.status(200).json(building);
    } catch (error) {
        console.error('Error fetching building:', error);
        res.status(500).json({ error: 'Failed to fetch building.' });
    }
});

router.post('/:userId/change-building', async (req, res): Promise<any> => {
    const { userId } = req.params; // User ID from Clerk
    const { buildingId } = req.body; // New building ID

    try {
        // Validate the new building
        const newBuilding = await prisma.studenthousing.findUnique({
            where: { id: parseInt(buildingId) },
        });
        if (!newBuilding) {
            return res.status(404).json({ error: 'Building not found.' });
        }

        // Fetch the user and their current building
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { Studenthousing: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const oldBuildingId = user.StudenthousingId;

        // Remove user from old building's chat if it exists
        if (oldBuildingId && oldBuildingId !== newBuilding.id) {
            const oldBuilding = await prisma.studenthousing.findUnique({
                where: { id: oldBuildingId },
            });

            if (oldBuilding?.chatId) {
                await prisma.chatMember.deleteMany({
                    where: {
                        chatId: oldBuilding.chatId,
                        userId: userId,
                    },
                });
            }
        }

        // Update user's building
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { StudenthousingId: newBuilding.id },
        });

        // Ensure the new building has a chat
        let newChat = null;
        if (newBuilding.chatId) {
            newChat = await prisma.chat.findFirst({
                where: { id: newBuilding.chatId },
            });
        }

        if (!newChat) {
            newChat = await prisma.chat.create({
                data: {
                    name: `${newBuilding.name} Chat`,
                    isGroup: true,
                },
            });

            await prisma.studenthousing.update({
                where: { id: newBuilding.id },
                data: { chatId: newChat.id },
            });
        }

        // Add the user to the new building's chat if not already a member
        const memberExists = await prisma.chatMember.findFirst({
            where: {
                chatId: newChat.id,
                userId: userId,
            },
        });

        if (!memberExists) {
            await prisma.chatMember.create({
                data: {
                    chatId: newChat.id,
                    userId: userId,
                    role: 'member',
                },
            });
        }

        res.status(200).json({
            message: 'Building updated successfully!',
            chatId: newChat.id,
        });
    } catch (error) {
        console.error('Error changing building:', error);
        res.status(500).json({ error: 'Failed to update building.' });
    }
});



export default router;
