import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cities Data
const cityData = [
    { id: 1, name: 'Gothenburg' },
];

// Universities Data
const universityData = [
    { id: 1, name: 'Gothenburg University', cityId: 1 },
    { id: 2, name: 'Chalmers University', cityId: 1 },
];

const studentHousingData = [
    { id: 1, name: 'Birger Jarl', latitude: 57.7072, longitude: 11.9668, cityId: 1 },
    { id: 2, name: 'Fridhemsgatan', latitude: 57.7089, longitude: 11.9674, cityId: 1 },
    { id: 3, name: 'Grevegårdsvägen', latitude: 57.7105, longitude: 11.9689, cityId: 1 },
    { id: 4, name: 'Högsbohöjd', latitude: 57.7123, longitude: 11.9703, cityId: 1 },
    { id: 5, name: 'Kaverös', latitude: 57.7135, longitude: 11.9711, cityId: 1 },
    { id: 6, name: 'Kungsladugård', latitude: 57.7147, longitude: 11.9724, cityId: 1 },
    { id: 7, name: 'Mandolingatan', latitude: 57.7160, longitude: 11.9735, cityId: 1 },
    { id: 8, name: 'Nya Varvet', latitude: 57.7172, longitude: 11.9750, cityId: 1 },
    { id: 9, name: 'Opaltorget', latitude: 57.7185, longitude: 11.9764, cityId: 1 },
    { id: 10, name: 'Oxhagsgatan', latitude: 57.7198, longitude: 11.9778, cityId: 1 },
    { id: 11, name: 'Pennygången', latitude: 57.7210, longitude: 11.9792, cityId: 1 },
    { id: 12, name: 'Prickskyttestigen', latitude: 57.7223, longitude: 11.9806, cityId: 1 },
    { id: 13, name: 'Sandarna', latitude: 57.7235, longitude: 11.9820, cityId: 1 },
    { id: 14, name: 'Sven Brolids väg', latitude: 57.7247, longitude: 11.9834, cityId: 1 },
    { id: 15, name: 'Västra Frölunda', latitude: 57.7260, longitude: 11.9848, cityId: 1 },

    // Additional Housing
    { id: 16, name: 'Brahegatan', latitude: 57.7271, longitude: 11.9859, cityId: 1 },
    { id: 17, name: 'Kastanjebacken', latitude: 57.7282, longitude: 11.9865, cityId: 1 },
    { id: 18, name: 'Kviberg', latitude: 57.7293, longitude: 11.9876, cityId: 1 },
    { id: 19, name: 'Lillatorp', latitude: 57.7304, longitude: 11.9887, cityId: 1 },
    { id: 20, name: 'Lunden', latitude: 57.7315, longitude: 11.9898, cityId: 1 },
    { id: 21, name: 'Rosendal', latitude: 57.7326, longitude: 11.9909, cityId: 1 },
    { id: 22, name: 'Sjukan', latitude: 57.7337, longitude: 11.9910, cityId: 1 },
    { id: 23, name: 'Östra Kålltorp', latitude: 57.7348, longitude: 11.9921, cityId: 1 },

    // More Housing Options
    { id: 24, name: 'Andra Långgatan', latitude: 57.7359, longitude: 11.9932, cityId: 1 },
    { id: 25, name: 'Central South', latitude: 57.7360, longitude: 11.9943, cityId: 1 },
    { id: 26, name: 'Dan Broströmhemmet', latitude: 57.7371, longitude: 11.9954, cityId: 1 },
    { id: 27, name: 'Doktor Forselius Backe', latitude: 57.7382, longitude: 11.9965, cityId: 1 },
    { id: 28, name: 'Doktor Lindhs gata', latitude: 57.7393, longitude: 11.9976, cityId: 1 },
    { id: 29, name: 'Första Långgatan', latitude: 57.7404, longitude: 11.9987, cityId: 1 },
    { id: 30, name: 'Gårda fabriker', latitude: 57.7415, longitude: 11.9998, cityId: 1 },
    { id: 31, name: 'Gibraltar', latitude: 57.7426, longitude: 12.0009, cityId: 1 },
    { id: 32, name: 'Guldhedstornet', latitude: 57.7437, longitude: 12.0010, cityId: 1 },
    { id: 33, name: 'Helmutsrogatan', latitude: 57.7448, longitude: 12.0021, cityId: 1 },
    { id: 34, name: 'Husaren', latitude: 57.7459, longitude: 12.0032, cityId: 1 },
    { id: 35, name: 'Hökegårdsgatan', latitude: 57.7460, longitude: 12.0043, cityId: 1 },
    { id: 36, name: 'Johannebergs vattentorn', latitude: 57.7471, longitude: 12.0054, cityId: 1 },
    { id: 37, name: 'Kjellmansgatan', latitude: 57.7482, longitude: 12.0065, cityId: 1 },
    { id: 38, name: 'Kronhusgatan', latitude: 57.7493, longitude: 12.0076, cityId: 1 },
    { id: 39, name: 'Medicinareberget', latitude: 57.7504, longitude: 12.0087, cityId: 1 },
    { id: 40, name: 'Norra Ågatan', latitude: 57.7515, longitude: 12.0098, cityId: 1 },
];


async function main() {
    console.log('Seeding database...');

    // Seed Cities
    for (const city of cityData) {
        await prisma.city.upsert({
            where: { id: city.id },
            update: {},
            create: { id: city.id, name: city.name },
        });
    }

    // Seed Universities
    for (const university of universityData) {
        await prisma.university.upsert({
            where: { id: university.id },
            update: {},
            create: {
                id: university.id,
                name: university.name,
                cityId: university.cityId,
            },
        });
    }

    // Seed Student Housing
    for (const housing of studentHousingData) {
        // create chatroom first
        const chat = await prisma.chat.create({
            data: {
                name: `${housing.name} Chat`,
                isGroup: true,
            },
        });
    



        await prisma.studenthousing.upsert({
            where: { id: housing.id },
            update: {},
            create: {
                id: housing.id,
                name: housing.name,
                latitude: housing.latitude,
                longitude: housing.longitude,
                cityId: housing.cityId,
                chatId: chat.id,
            },
        });
    }

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
