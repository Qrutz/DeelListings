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

// endpoint to edit users radius
router.patch('/radius', requireAuth(), async (req, res):Promise<any>  => {
    const { radius } = req.body;
    const userId = req.auth?.userId;
        // Validate the radius
        if (!radius || radius < 100 || radius > 50000) {
            return res.status(400).json({ error: 'Invalid radius range.' });
          }

    try {
        const user = await prisma.user.update({
            where: { id: userId! },
            data: { 
                preferredRadius: radius,
             },
        });
        return res.json({ success: true, user: user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update radius' });
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


router.get('/:id/deals', async (req: Request, res: Response): Promise<any>  => {
    try {
      const userId = req.params.id;
  
      // Find all swaps (deals) where user is the proposer or recipient
      const deals = await prisma.swap.findMany({
        where: {
          OR: [
            { proposerId: userId },
            { recipientId: userId },
          ],
        },
        // Include the related listings for each side of the swap
        include: {
          listingA: true,
          listingB: true,
        },
        // Optionally, you can also sort by created date:
        orderBy: {
          createdAt: 'desc',
        },
      });
  
      return res.json(deals);
    } catch (error) {
      console.error('Error fetching deals:', error);
      return res.status(500).json({ error: 'Failed to fetch deals', details: error });
    }
  });



export default router;