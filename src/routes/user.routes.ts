import express, { Request, Response } from 'express';
import { generateSasUrl } from '../utils/azure.utils';
import { AuthObject, clerkClient, ExpressRequestWithAuth, requireAuth } from '@clerk/express';
import { prisma } from '../../prisma/client';

const router = express.Router();


// get user details
router.get('/me', requireAuth(), async (req: ExpressRequestWithAuth, res): Promise<any> => {
    try {
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // fetch user details
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                university: true,
                Studenthousing: true,
            }
        })
        console.log(user);
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/me/listings', requireAuth(), async (req: ExpressRequestWithAuth, res): Promise<any> => {;
    try {
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // fetch listings associated with the user
        const listings = await prisma.listing.findMany({
            where: {
                userId,
            }
        })
        return res.json(listings);
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


// endpoint to just edit onboarded attribute
router.post('/onboard', requireAuth(), async (req, res) => {
    try {
        const userId = req.auth?.userId;

        // Update DB and metadata
        const updatedUser = await prisma.user.update({
            where: { id: userId! },
            data: { isOnboarded: true },
        });

        // Sync metadata with Clerk
        await clerkClient.users.updateUserMetadata(userId!, {
            publicMetadata: {
                isOnboarded: true,
            },
        });

        res.status(200).json({ message: 'Onboarding completed' });
    } catch (error) {
        console.error('Error updating onboarding status:', error);
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});



// endpoint for update housing 
router.patch('/housing', requireAuth(), async (req, res) => {
    const { StudenthousingId } = req.body;
    const userId = req.auth?.userId;

    try {
        const user = await prisma.user.update({
            where: { id: userId! },
            data: { StudenthousingId },
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update housing' });
    }
});


// endpoint to get a user by id
router.get('/:id', async (req: Request, res: Response):Promise<any> => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: id },
            include: {
                university: true,
                Studenthousing: true,
                listings: true,
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(user);
    } catch (error) {
        console.log('Error fetching user:', error);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }

}
);



export default router;