import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Seed buildings
    await prisma.building.createMany({
        data: [
            { name: 'Chalmers Studentbostäder', latitude: 57.6916, longitude: 11.9726 },
            { name: 'SGS Olofshöjd', latitude: 57.6944, longitude: 11.9803 },
        ],
    });

    // Seed users
    await prisma.user.createMany({
        data: [
            { name: 'Alice', email: 'alice@example.com', buildingId: 1 },
            { name: 'Bob', email: 'bob@example.com', buildingId: 2 },
        ],
    });

    // Seed listings
    await prisma.listing.createMany({
        data: [
            {
                title: 'Calculus Textbook',
                description: 'Great condition, barely used.',
                price: 300,
                category: 'Textbooks',
                latitude: 57.6916,
                longitude: 11.9726,
                userId: 1,
            },
            {
                title: 'Mountain Bike',
                description: 'Perfect for trails around Gothenburg.',
                price: 2000,
                category: 'Bikes',
                latitude: 57.6944,
                longitude: 11.9803,
                userId: 2,
            },
            {
                title: 'Desk Lamp',
                description: 'Bright LED lamp for studying.',
                price: 100,
                category: 'Furniture',
                latitude: 57.6916,
                longitude: 11.9726,
                userId: 1,
            },
            {
                title: 'Wireless Headphones',
                description: 'Excellent sound quality.',
                price: 800,
                category: 'Electronics',
                latitude: 57.6944,
                longitude: 11.9803,
                userId: 2,
            },
        ],
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
