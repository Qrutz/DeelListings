import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Create a listing
app.post('/listings', async (req: Request, res: Response) => {
    try {
        const { title, description, price, latitude, longitude } = req.body;
        const newListing = await prisma.listing.create({
            data: {
                title,
                description,
                price,
                latitude,
                longitude,
                userId: 1, // Hardcoded for now
                category: 'Miscellaneous', // Hardcoded for now
            },
        });
        res.status(201).json(newListing);
    } catch (error) {
        res.status(500).json({ error: 'Error creating listing', details: error });
    }
});

app.get('/listings/proximity', async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId, radius, category } = req.query as {
            userId: string;
            radius: string;
            category?: string;
        };

        // Fetch user and their building
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            include: { building: true },
        });

        if (!user || !user.building) {
            return res.status(404).json({ error: 'User or building not found' });
        }

        const { latitude, longitude } = user.building;

        // Use parameterized query for proximity and optional category
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

        // Build the parameters array
        const params: (string | number)[] = [latitude, longitude, Number(radius)];
        if (category) params.push(category);

        const listings = await prisma.$queryRawUnsafe(query, ...params);

        res.status(200).json(listings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching listings by proximity', details: error });
    }
});
// Get all listings
app.get('/listings', async (req: Request, res: Response) => {
    try {
        const listings = await prisma.listing.findMany();
        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listings', details: error });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
