import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Create City
    const gothenburg = await prisma.city.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'Gothenburg' },
    });

    // Create Universities
    const gu = await prisma.university.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'Gothenburg University', cityId: gothenburg.id },
    });

    const chalmers = await prisma.university.upsert({
        where: { id: 2 },
        update: {},
        create: { name: 'Chalmers University', cityId: gothenburg.id },
    });

    // Create Student Housing
    await prisma.studenthousing.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Olofshöjd',
            latitude: 57.6980,
            longitude: 11.9782,
            cityId: gothenburg.id,
        },
    });

    await prisma.studenthousing.upsert({
        where: { id: 2 },
        update: {},
        create: {
            name: 'Kviberg',
            latitude: 57.7320,
            longitude: 12.0363,
            cityId: gothenburg.id,
        },
    });

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
