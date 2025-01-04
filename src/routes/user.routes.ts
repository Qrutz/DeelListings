import express, { Request, Response } from 'express';
import { generateSasUrl } from '../utils/azure.utils';
import { AuthObject, ExpressRequestWithAuth, requireAuth } from '@clerk/express';
import { prisma } from '../../prisma/client';

const router = express.Router();


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



export default router;
