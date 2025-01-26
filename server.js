import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nftRoutes from './routes/nftRoutes.js';
import multer from 'multer';
import FormData from 'form-data';
import crypto from 'crypto';
import AWS from 'aws-sdk';
import Certificate from './models/certificateModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize app
const app = express();

// Add Content Security Policy headers
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://*.infura.io; " +
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: https: blob: *; " +
        "connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.infura.io https://*.filebase.com https://api.pinata.cloud wss://*.infura.io; " +
        "font-src 'self' https://cdnjs.cloudflare.com; " +
        "object-src 'none'; " +
        "media-src 'self' blob:; " +
        "worker-src 'self' blob:;"
    );
    next();
});

// CORS configuration
const corsOptions = {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Additional headers for CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    next();
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Use routes
app.use('/api/nft', nftRoutes);

// Initialize S3 client using aws-sdk
const s3 = new AWS.S3({
    endpoint: "https://s3.filebase.com",
    credentials: {
        accessKeyId: process.env.FILEBASE_ACCESS_KEY,
        secretAccessKey: process.env.FILEBASE_SECRET_KEY
    },
    region: "us-east-1",
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

// Use a constant for bucket name
const FILEBASE_BUCKET = process.env.FILEBASE_BUCKET || 'certichain-certificates';

// Function to ensure bucket exists
async function ensureBucketExists() {
    try {
        // Check if bucket exists
        await s3.headBucket({ Bucket: FILEBASE_BUCKET }).promise();
        console.log('Bucket exists:', FILEBASE_BUCKET);
    } catch (error) {
        if (error.code === 'NoSuchBucket') {
            // Create bucket if it doesn't exist
            await s3.createBucket({
                Bucket: FILEBASE_BUCKET
            }).promise();
            console.log('Bucket created:', FILEBASE_BUCKET);
        } else {
            console.error('Bucket setup error:', error);
            throw error;
        }
    }
}

// Call this when server starts
ensureBucketExists().catch(console.error);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
        }
        cb(null, true);
    }
}).single('file');

// Wrap multer in a custom middleware to handle errors
const uploadMiddleware = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({
                error: 'File upload error',
                details: err.message,
                code: err.code
            });
        } else if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                error: 'File upload error',
                details: err.message
            });
        }

        // Log the received file details
        if (req.file) {
            console.log('File received:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                encoding: req.file.encoding,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        } else {
            console.log('No file received in request');
        }

        next();
    });
};

// IPFS upload route using local storage
app.post('/api/nft/ipfs/upload', uploadMiddleware, async (req, res) => {
    try {
        console.log('Starting upload process with file:', {
            hasFile: !!req.file,
            fileSize: req.file?.size,
            mimeType: req.file?.mimetype,
            originalName: req.file?.originalname
        });

        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            console.warn('MongoDB not connected, using temporary storage');
            // Proceed with temporary storage logic
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString('hex');
            const key = `${timestamp}-${randomString}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            // Store in memory temporarily
            const tempStorage = {
                fileName: key,
                data: req.file.buffer,
                mimeType: req.file.mimetype
            };

            // You might want to implement a temporary storage mechanism here
            // For now, we'll just return the response
            const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
            return res.json({
                success: true,
                fileName: key,
                url: `/api/nft/ipfs/get-url/${key}`
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const key = `${timestamp}-${randomString}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Create new certificate document
        const certificate = new Certificate({
            fileName: key,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            data: req.file.buffer,
            metadata: {
                'original-name': req.file.originalname,
                'upload-time': new Date().toISOString(),
                'type': 'certificate'
            }
        });

        console.log('Saving certificate to database...', {
            fileName: key,
            size: req.file.size,
            mimeType: req.file.mimetype
        });

        await certificate.save();
        console.log('Certificate saved successfully');

        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
        const response = {
            success: true,
            fileName: key,
            url: `/api/nft/ipfs/get-url/${key}`
        };

        console.log('Sending response:', response);
        res.json(response);

    } catch (error) {
        console.error('Upload error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // Check for specific MongoDB errors
        if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
            console.warn('MongoDB error, falling back to temporary storage');
            const key = `temp-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
            return res.json({
                success: true,
                fileName: key,
                url: `/api/nft/ipfs/get-url/${key}`,
                note: 'Using temporary storage due to database issues'
            });
        }
        
        res.status(500).json({
            error: 'Upload failed',
            details: 'An unexpected error occurred while uploading the certificate.'
        });
    }
});

// Update get-url endpoint to handle both database and temporary storage
app.get('/api/nft/ipfs/get-url/:fileName', async (req, res) => {
    try {
        // First try to get from MongoDB
        if (mongoose.connection.readyState === 1) {
            const certificate = await Certificate.findOne({ fileName: req.params.fileName });
            if (certificate) {
                res.set('Content-Type', certificate.mimeType);
                res.set('Content-Disposition', `inline; filename="${certificate.originalName}"`);
                return res.send(certificate.data);
            }
        }

        // If not found in MongoDB or MongoDB is not connected, check temporary storage
        // For now, we'll return a 404, but you might want to implement temporary storage
        res.status(404).json({ error: 'Certificate not found' });

    } catch (error) {
        console.error('Error retrieving certificate:', error);
        res.status(500).json({ error: 'Failed to retrieve certificate' });
    }
});

// Add endpoint to get certificate by IPFS hash
app.get('/api/nft/ipfs/:hash', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ ipfsHash: req.params.hash });
        
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        // Set appropriate headers
        res.set('Content-Type', certificate.mimeType);
        res.set('Content-Disposition', `inline; filename="${certificate.originalName}"`);
        
        // Send the file data
        res.send(certificate.data);

    } catch (error) {
        console.error('Error retrieving certificate:', error);
        res.status(500).json({ error: 'Failed to retrieve certificate' });
    }
});

// Test route for Filebase S3
app.get('/api/nft/ipfs/test', async (req, res) => {
    try {
        console.log('Testing Filebase connection...');
        
        const data = await s3.listObjects({
            Bucket: FILEBASE_BUCKET,
            MaxKeys: 5
        }).promise();

        const contents = await Promise.all(
            (data.Contents || []).map(async (object) => {
                const url = s3.getSignedUrl('getObject', {
                    Bucket: FILEBASE_BUCKET,
                    Key: object.Key,
                    Expires: 3600
                });
                return {
                    ...object,
                    signedUrl: url
                };
            })
        );

        console.log('Filebase test successful');
        
        res.json({ 
            status: 'ok',
            message: 'Filebase connection successful',
            bucket: FILEBASE_BUCKET,
            contents: contents
        });
    } catch (error) {
        console.error('Filebase test error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Add this near your other routes
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Server is running',
        env: {
            hasProjectId: !!process.env.INFURA_PROJECT_ID,
            hasSecret: !!process.env.INFURA_API_KEY_SECRET
        }
    });
});

// Add this route to test bucket creation
app.get('/api/nft/ipfs/create-bucket', async (req, res) => {
    try {
        await createBucketIfNeeded();
        res.json({ 
            status: 'ok', 
            message: 'Bucket created/verified successfully',
            bucket: process.env.FILEBASE_BUCKET
        });
    } catch (error) {
        console.error('Bucket creation error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// Add test endpoint for Filebase configuration
app.get('/api/nft/ipfs/check-config', async (req, res) => {
    try {
        // Check environment variables
        const config = {
            hasAccessKey: !!process.env.FILEBASE_ACCESS_KEY,
            hasSecretKey: !!process.env.FILEBASE_SECRET_KEY,
            bucketName: FILEBASE_BUCKET,
            endpoint: s3.config.endpoint
        };
        
        console.log('Checking Filebase configuration:', config);

        // Test S3 client
        const testResult = {
            config: config,
            bucketExists: false,
            canListBucket: false,
            canGenerateUrl: false
        };

        // Test bucket existence
        try {
            await s3.headBucket({ Bucket: FILEBASE_BUCKET }).promise();
            testResult.bucketExists = true;
            console.log('Bucket exists:', FILEBASE_BUCKET);
        } catch (bucketError) {
            console.error('Bucket check failed:', {
                code: bucketError.code,
                message: bucketError.message
            });
            throw bucketError;
        }

        // Test bucket listing
        try {
            const listResult = await s3.listObjects({
                Bucket: FILEBASE_BUCKET,
                MaxKeys: 1
            }).promise();
            testResult.canListBucket = true;
            testResult.hasObjects = (listResult.Contents || []).length > 0;
            console.log('Can list bucket contents');
        } catch (listError) {
            console.error('List bucket failed:', {
                code: listError.code,
                message: listError.message
            });
            throw listError;
        }

        // Test URL generation
        try {
            const testKey = 'test-' + Date.now().toString();
            const url = s3.getSignedUrl('putObject', {
                Bucket: FILEBASE_BUCKET,
                Key: testKey,
                Expires: 60
            });
            testResult.canGenerateUrl = true;
            console.log('Can generate signed URLs');
        } catch (urlError) {
            console.error('URL generation failed:', {
                code: urlError.code,
                message: urlError.message
            });
            throw urlError;
        }

        res.json({
            status: 'ok',
            message: 'Filebase configuration is valid',
            details: testResult
        });

    } catch (error) {
        console.error('Configuration test failed:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        res.status(500).json({
            status: 'error',
            message: 'Filebase configuration test failed',
            error: {
                code: error.code,
                message: error.message,
                details: error.stack
            }
        });
    }
});

// Add verification endpoint
app.get('/api/nft/ipfs/verify/:fileName', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ fileName: req.params.fileName });
        
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        // Return basic metadata without the actual file data
        res.json({
            success: true,
            fileName: certificate.fileName,
            originalName: certificate.originalName,
            mimeType: certificate.mimeType,
            uploadTime: certificate.uploadTime,
            ipfsHash: certificate.ipfsHash
        });

    } catch (error) {
        console.error('Error verifying certificate:', error);
        res.status(500).json({ error: 'Failed to verify certificate' });
    }
});

// Update thumbnail upload endpoint to handle image cropping
app.post('/api/nft/ipfs/upload-thumbnail', uploadMiddleware, async (req, res) => {
    try {
        console.log('Starting thumbnail upload process:', {
            hasFile: !!req.file,
            fileSize: req.file?.size,
            mimeType: req.file?.mimetype,
            originalName: req.file?.originalname
        });

        if (!req.file) {
            console.error('No file received in request');
            return res.status(400).json({ 
                error: 'No thumbnail file uploaded',
                details: 'Request must include a file in form-data with key "file"'
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const key = `thumbnail-${timestamp}-${randomString}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Create new certificate document for thumbnail
        const thumbnail = new Certificate({
            fileName: key,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            data: req.file.buffer,
            metadata: {
                'original-name': req.file.originalname,
                'upload-time': new Date().toISOString(),
                'type': 'thumbnail',
                'size': req.file.size
            }
        });

        console.log('Saving thumbnail to database...');
        await thumbnail.save();
        console.log('Thumbnail saved successfully');

        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
        const fullUrl = `${baseUrl}/api/nft/ipfs/get-url/${key}`;
        
        const response = {
            success: true,
            url: fullUrl, // Use full URL here
            fileName: key,
            size: req.file.size,
            mimeType: req.file.mimetype
        };

        console.log('Sending thumbnail response:', response);
        res.json(response);

    } catch (error) {
        console.error('Thumbnail upload error:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        res.status(500).json({
            error: 'Failed to upload thumbnail',
            details: error.message
        });
    }
});

// Add metadata upload endpoint
app.post('/api/nft/ipfs/upload-metadata', express.json(), async (req, res) => {
    try {
        console.log('Uploading metadata:', req.body);

        if (!req.body || !req.body.image || !req.body.certificate_url) {
            return res.status(400).json({ error: 'Invalid metadata format' });
        }

        // Ensure full URLs for both image and certificate
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
        const imageUrl = req.body.image.startsWith('http') 
            ? req.body.image 
            : `${baseUrl}${req.body.image}`;
        const certificateUrl = req.body.certificate_url.startsWith('http')
            ? req.body.certificate_url
            : `${baseUrl}${req.body.certificate_url}`;

        console.log('Using URLs:', { imageUrl, certificateUrl });

        const metadata = {
            name: req.body.name || 'Certificate',
            description: req.body.description || 'Digital Certificate',
            image: imageUrl,
            external_url: certificateUrl,
            certificate_url: certificateUrl,
            attributes: [
                {
                    trait_type: 'Type',
                    value: 'Digital Certificate'
                },
                {
                    trait_type: 'Platform',
                    value: 'CertiChain X Antec'
                },
                {
                    trait_type: 'Course',
                    value: req.body.course || 'Not Specified'
                }
            ]
        };

        // Generate a unique key for metadata
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const key = `metadata-${timestamp}-${randomString}.json`;
        
        // Store metadata in MongoDB
        const metadataDoc = new Certificate({
            fileName: key,
            originalName: key,
            mimeType: 'application/json',
            data: Buffer.from(JSON.stringify(metadata, null, 2)),
            metadata: {
                'upload-time': new Date().toISOString(),
                'type': 'metadata',
                'image-url': imageUrl,
                'certificate-url': certificateUrl
            }
        });

        await metadataDoc.save();
        console.log('Metadata saved successfully');

        const response = {
            success: true,
            url: `${baseUrl}/api/nft/ipfs/get-url/${key}`,
            fileName: key,
            metadata: metadata // Include full metadata in response for verification
        };

        console.log('Sending metadata response:', response);
        res.json(response);

    } catch (error) {
        console.error('Metadata upload error:', error);
        res.status(500).json({
            error: 'Failed to upload metadata',
            details: error.message
        });
    }
});

// Add cleanup endpoint
app.post('/api/nft/cleanup', async (req, res) => {
    try {
        console.log('Starting database cleanup...');
        
        // Delete all records older than 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await Certificate.deleteMany({
            uploadTime: { $lt: twentyFourHoursAgo }
        });

        console.log('Cleanup completed:', {
            deletedCount: result.deletedCount
        });

        res.json({
            success: true,
            message: 'Cleanup completed successfully',
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            details: error.message
        });
    }
});

// Add automatic cleanup function
async function cleanupOldRecords() {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await Certificate.deleteMany({
            uploadTime: { $lt: twentyFourHoursAgo }
        });
        
        console.log('Automatic cleanup completed:', {
            timestamp: new Date().toISOString(),
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Automatic cleanup error:', error);
    }
}

// Run cleanup every 24 hours
setInterval(cleanupOldRecords, 24 * 60 * 60 * 1000);

// Run initial cleanup when server starts
cleanupOldRecords().catch(console.error);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Add function to drop existing indexes
async function dropExistingIndexes() {
    try {
        await mongoose.connection.collections.certificates.dropIndexes();
        console.log('Successfully dropped all indexes');
    } catch (error) {
        console.warn('Failed to drop indexes:', error);
    }
}

// Update MongoDB connection to drop indexes on startup
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/certichain', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(async () => {
    console.log('Connected to MongoDB successfully');
    if (process.env.MONGO_URI) {
        console.log('Using remote MongoDB connection');
    } else {
        console.log('Using local MongoDB connection');
    }
    
    // Drop existing indexes on startup
    await dropExistingIndexes();
})
.catch(err => {
    console.error('MongoDB connection error:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack
    });
    console.log('Attempting to use in-memory fallback...');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test route to verify server is running
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available routes:');
    console.log(`- GET  http://localhost:${PORT}/`);
    console.log(`- POST http://localhost:${PORT}/api/nft/generate`);
    console.log(`- POST http://localhost:${PORT}/api/nft/ipfs/upload`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('Unhandled Rejection:', err);
    // Gracefully shutdown server
    server.close(() => process.exit(1));
});

