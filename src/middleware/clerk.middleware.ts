import { AuthObject, clerkMiddleware } from '@clerk/express';

// Extend the Request interface globally (optional but avoids redundancy)
declare global {
    namespace Express {
        interface Request {
            auth: AuthObject; // Type-safe Clerk auth object
        }
    }
}



export const useClerkMiddleware = () => clerkMiddleware();
