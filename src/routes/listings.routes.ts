import express, { Request, Response } from 'express';
import { clerkClient, requireAuth } from '@clerk/express';
import {prisma} from '../../prisma/client';
import { Listing } from '@prisma/client';
import { ExpressRequestWithAuth } from '@clerk/express';

const router = express.Router();

// Create a listing
router.post('/', async (req: ExpressRequestWithAuth, res: Response) => {
    try {
        const { title, description, price, latitude, longitude, imageUrl } = req.body;

        const newListing = await prisma.listing.create({
            data: {
                title,
                description,
                price,
                latitude,
                longitude,
                ImageUrl: imageUrl,
                userId: req.auth.userId!,
                category: 'Miscellaneous', // Hardcoded for now
            },
        });
        res.status(201).json(newListing);
    } catch (error) {
        res.status(500).json({ error: 'Error creating listing', details: error });
    }
});

// Get all listings
router.get('/', async (req: ExpressRequestWithAuth, res: Response): Promise<any> => {
    try {
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }


        const listings = await prisma.listing.findMany({
            where: {
                userId: {not: userId}
            },
            include: {
                user: true,
            },
        });
        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listings', details: error });
    }
});

router.get('/listings/proximity', async (req: Request, res: Response): Promise<any> => {
    try {
        const { latitude, longitude, radius, category } = req.query as {
            latitude: string;
            longitude: string;
            radius: string;
            category?: string;
        };

        if (!latitude || !longitude || !radius) {
            return res.status(400).json({ error: 'latitude, longitude, and radius are required' });
        }

        // Query listings nearby
        const query = `
            SELECT l.*, (
                6371 * acos(
                    cos(radians($1)) *
                    cos(radians(l.latitude)) *
                    cos(radians(l.longitude) - radians($2)) +
                    sin(radians($1)) *
                    sin(radians(l.latitude))
                )
            ) AS distance
            FROM "Listing" l
            WHERE (
                6371 * acos(
                    cos(radians($1)) *
                    cos(radians(l.latitude)) *
                    cos(radians(l.longitude) - radians($2)) +
                    sin(radians($1)) *
                    sin(radians(l.latitude))
                )
            ) <= $3
            ${category ? `AND l.category = $4` : ''}
            ORDER BY distance;
        `;

        const params: (string | number)[] = [
            parseFloat(latitude),
            parseFloat(longitude),
            parseFloat(radius),
        ];
        if (category) params.push(category);

        const nearbyListings = await prisma.$queryRawUnsafe<Listing[]>(query, ...params);

        res.status(200).json(nearbyListings);
    } catch (error) {
        console.error('Error fetching listings by proximity:', error);
        res.status(500).json({ error: 'Error fetching listings by proximity', details: error });
    }
});

// Get a single listing by ID
router.get('/:id', requireAuth(), async (req: ExpressRequestWithAuth, res: Response): Promise<any> => {
    try {
        // 1. Fetch the logged-in user ID from Clerk's auth middleware
        const userId = req.auth.userId;

        // 2. Get the listing ID from request params
        const listingId = parseInt(req.params.id, 10); // Parse ID safely

        if (isNaN(listingId)) {
            return res.status(400).json({ error: 'Invalid listing ID' });
        }

        // 3. Fetch the listing and include the associated user data
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            
        });

        // 4. Return 404 if listing not found
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        // 5. Fetch additional user details from Clerk
        const user = await clerkClient.users.getUser(listing.userId);

        if (!user || !user.id || !user.fullName || !user.imageUrl) {
            return res.status(404).json({ error: 'User information is incomplete' });
        }

        // 6. Determine if the current user owns the listing
        const isOwner = userId === listing.userId;

        // 7. Respond with listing details, user data, and ownership info
        res.status(200).json({
            ...listing,
            user: {
                id: user.id,
                fullName: user.fullName,
                image: user.imageUrl,
            },
            isOwner, // Ownership flag
        });

    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ error: 'Error fetching listing', details: error });
    }
});

export default router;
