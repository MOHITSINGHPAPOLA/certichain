import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        unique: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    data: {
        type: Buffer,
        required: true
    },
    metadata: {
        type: Object,
        default: {}
    },
    uploadTime: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    strict: false // Allow additional fields without explicit definition
});

// Drop any existing indexes and create only the ones we need
certificateSchema.pre('save', async function() {
    try {
        await mongoose.connection.collections.certificates.dropIndexes();
        await mongoose.connection.collections.certificates.createIndex({ fileName: 1 });
    } catch (error) {
        console.warn('Index operation warning:', error);
        // Continue even if index operation fails
    }
});

const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate; 