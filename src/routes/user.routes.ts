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

// Map email domains to universities
const domainToUniversity: { [key: string]: string } = {
    'student.gu.se': 'Gothenburg University',
    'chalmers.se': 'Chalmers University',
    'liu.se': 'Linköping University',
    'kth.se': 'KTH Royal Institute of Technology',
};

router.post('/university', requireAuth(), async (req, res): Promise<any> => {
    try {
        // Get user ID from Clerk
        const userId = req.auth?.userId;

        // Fetch user data from Clerk
        const clerkUser = await clerkClient.users.getUser(userId!);
        const email = clerkUser.emailAddresses[0].emailAddress; // Primary email

        // Extract university based on email domain
        const domain = email.split('@')[1];
        const universityName = domainToUniversity[domain];

        if (!universityName) {
            return res.status(400).json({ error: 'Invalid university email address' });
        }

        // Find or create the university
        let university = await prisma.university.findFirst({
            where: { name: universityName },
        });

        if (!university) {
            university = await prisma.university.create({
                data: { name: universityName },
            });
        }

        // Update Clerk metadata
        await clerkClient.users.updateUser(userId!, {
            publicMetadata: { university: universityName },
        });

        // Update database
        await prisma.user.update({
            where: { id: userId! },
            data: { universityId: university.id },
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error registering university:', error);
        return res.status(500).json({ error: 'Failed to register university' });
    }
});

export default router;