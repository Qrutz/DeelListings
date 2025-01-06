import http from 'http';
import app from './app';
import { Server } from 'socket.io';
import { prisma } from '../prisma/client';
import { initializeSocket, shutdownSockets } from './socket';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize sockets
const io = initializeSocket(server);

// Graceful shutdown handler
const shutdown = async () => {
    console.log('Shutting down server...');

    // Disconnect all sockets
    await shutdownSockets();

    // Disconnect Prisma
    await prisma.$disconnect();

    // Close the server
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });

    // Force exit if still running after 5 seconds
    setTimeout(() => {
        console.warn('Forcing shutdown...');
        process.exit(1);
    }, 5000);
};


process.on('SIGINT', shutdown);  // Handle Ctrl+C
process.on('SIGTERM', shutdown); // Handle external termination

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
