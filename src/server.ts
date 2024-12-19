import express, { Request, Response } from 'express';
import { Listing, PrismaClient } from '@prisma/client';
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import cors from 'cors';

const app = express();

// enable cors for http://127.0.0.1:8080/ 
app.use(cors({ origin: 'http://127.0.0.1:8080' }));




const prisma = new PrismaClient();


app.use(express.json());



// Azure Blob Storage Config
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!accountName || !accountKey || !containerName) {
    throw new Error('Missing Azure Storage configuration in environment variables');
}

// Generate SAS URL
app.post('/generate-sas-url', async (req: Request, res: Response) => {
    try {
        const { fileName } = req.body;

        // Set expiry time (30 minutes from now)
        // Extend the expiry time to 1 hour into the future
        const expiryTime = new Date();
        expiryTime.setUTCHours(expiryTime.getUTCHours() + 1);


        // Generate SAS token
        const sasToken = generateBlobSASQueryParameters(
            {
                containerName,
                blobName: fileName,
                permissions: BlobSASPermissions.parse('rcw'), // Read, Create, Write
                expiresOn: expiryTime, // Use UTC-compliant time
            },
            new StorageSharedKeyCredential(accountName, accountKey)
        ).toString();

        const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${fileName}?${sasToken}`;

       
        res.status(200).json({ sasUrl });
    } catch (error) {
        console.error('Error generating SAS URL:', error);
        // @ts-ignore
        res.status(500).json({ error: 'Failed to generate SAS URL', details: error.message });
    }
});


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

        const { latitude, longitude, id: buildingId } = user.building;

        // Query for listings in the same building
        const sameBuildingListings = await prisma.listing.findMany({
            where: {
                user: {
                    buildingId,
                },
                ...(category && { category }),
            },
        });

        // If there are enough listings in the same building, return them
        if (sameBuildingListings.length > 0) {
            return res.status(200).json(sameBuildingListings);
        }

        // Query for listings nearby (fallback to proximity-based)
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

        const params: (string | number)[] = [latitude, longitude, Number(radius)];
        if (category) params.push(category);

        const nearbyListings = await prisma.$queryRawUnsafe<Listing[]>(query, ...params);

        // Combine the results, prioritizing same-building listings
        const combinedListings = [...sameBuildingListings, ...nearbyListings];

        res.status(200).json(combinedListings);
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
