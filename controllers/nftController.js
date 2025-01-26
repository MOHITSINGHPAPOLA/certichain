import { generateCertificate } from '../utils/certificateGenerator.js';

// Generate NFT certificate
export const generateNFT = async (req, res) => {
    try {
        console.log('Received generation request:', req.body);
        const { name, course } = req.body;
        
        if (!name || !course) {
            throw new Error('Name and course are required');
        }

        const certificateBuffer = await generateCertificate(name, course);
        console.log('Certificate generated successfully:', {
            bufferSize: certificateBuffer.length,
            bufferType: 'PNG'
        });

        // Set proper headers for PNG image
        res.set({
            'Content-Type': 'image/png',
            'Content-Length': certificateBuffer.length,
            'Content-Disposition': 'inline; filename="certificate.png"',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        // Send the buffer directly
        res.send(certificateBuffer);
    } catch (error) {
        console.error('Certificate generation error:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to generate certificate',
            details: error.message 
        });
    }
};
