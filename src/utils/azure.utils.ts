import {
    BlobSASPermissions,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
} from '@azure/storage-blob';

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

if (!accountName || !accountKey || !containerName) {
    throw new Error('Missing Azure Storage configuration in environment variables');
}

// Sanitize filenames
export function sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
}

// Generate SAS URL
export async function generateSasUrl(fileName: string): Promise<string> {
    const sanitizedFileName = sanitizeFilename(fileName);
    const expiryTime = new Date();
    expiryTime.setUTCHours(expiryTime.getUTCHours() + 1); // 1 hour expiry

    const sasToken = generateBlobSASQueryParameters(
        {
            containerName,
            blobName: sanitizedFileName,
            permissions: BlobSASPermissions.parse('rcw'),
            expiresOn: expiryTime,
        },
        new StorageSharedKeyCredential(accountName, accountKey)
    ).toString();

    return `https://${accountName}.blob.core.windows.net/${containerName}/${sanitizedFileName}?${sasToken}`;
}
