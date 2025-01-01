import express, { Request, Response } from 'express';
import { clerkClient } from '@clerk/express';
import {prisma} from '../../prisma/client';
import { Listing } from '@prisma/client';

const router = express.Router();

// Create a listing
router.post('/', async (req: Request, res: Response) => {
    try {
        const { title, description, price, latitude, longitude, userId, imageUrl } = req.body;

        const newListing = await prisma.listing.create({
            data: {
                title,
                description,
                price,
                latitude,
                longitude,
                ImageUrl: imageUrl,
                userId,
                category: 'Miscellaneous', // Hardcoded for now
            },
        });
        res.status(201).json(newListing);
    } catch (error) {
        res.status(500).json({ error: 'Error creating listing', details: error });
    }
});

// Get all listings
router.get('/', async (req: Request, res: Response) => {
    try {
        const listings = await prisma.listing.findMany();
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
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const listing = await prisma.listing.findUnique({ where: { id: parseInt(id) } });

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const user = await clerkClient.users.getUser(listing.userId);
        if (!user || !user.id || !user.fullName || !user.imageUrl) {
            return res.status(404).json({ error: 'User missing required fields' });
        }

        res.status(200).json({
            ...listing,
            user: {
                id: user.id,
                fullName: user.fullName,
                image: user.imageUrl,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listing', details: error });
    }
});

export default router;
