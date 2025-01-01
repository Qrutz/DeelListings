import express, { Request, Response } from 'express';
import { Listing, PrismaClient } from '@prisma/client';
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { clerkClient, requireAuth } from '@clerk/express'



const app = express();

app.use(clerkMiddleware())

// enable cors for http://127.0.0.1:8080/ 
app.use(cors({ origin: 'http://localhost:8081' }));




const prisma = new PrismaClient();


app.use(express.json());



// Azure Blob Storage Config
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!accountName || !accountKey || !containerName) {
    throw new Error('Missing Azure Storage configuration in environment variables');
}

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9_.-]/g, '_') // Replace invalid characters with underscores
        .toLowerCase(); // Optionally convert to lowercase for consistency
}


// create an hello world endpoint so we can test ip setup
app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});


// Generate SAS URL
app.post('/generate-sas-url', async (req: Request, res: Response) => {
    try {
        let { fileName } = req.body;

        // Sanitize the filename
        fileName = sanitizeFilename(fileName);

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
        const { title, description, price, latitude, longitude, userId, imageUrl } = req.body;
        const newListing = await prisma.listing.create({
            data: {
                title,
                description,
                price,
                latitude,
                longitude,
                ImageUrl: imageUrl,
                userId: userId, // Hardcoded for now
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

// Get all listings
app.get('/listings', async (req: Request, res: Response) => {
    try {
        const listings = await prisma.listing.findMany();
        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listings', details: error });
    }
});


// Get a single listing by ID
app.get('/listings/:id', async (req: Request, res: Response): Promise<any> => {
    try {
      
        const { id } = req.params;
        const listing = await prisma.listing.findUnique({ where: { id: parseInt(id) } });
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }


        // Fetch the user who created the listing
        const user = await clerkClient.users.getUser(listing.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // check if user has all the required fields
        if (!user.id || !user.fullName || !user.imageUrl) {
            return res.status(404).json({ error: 'User missing required fields' });
        }

        console.log(listing);

        res.status(200).json({ ...listing, user:
            {
                id: user.id,
                fullName: user.fullName,
                image: user.imageUrl
            }
         });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listing', details: error });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
