import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const styles = {
    professional: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D4AF37', // Rich gold
        textColor: '#1B365D', // Royal blue
        accentColor: '#D4AF37',
        secondaryAccent: '#4A90E2', // Bright blue
        goldGradient: ['#D4AF37', '#F7E98D', '#D4AF37'],
        blueGradient: ['#1B365D', '#4A90E2', '#1B365D'],
        fonts: {
            header: 'bold 160px Arial',
            name: 'bold 140px Arial',
            course: 'bold 110px Arial',
            appreciation: 'bold 75px Arial',
            achievement: 'italic 65px Arial',
            date: 'italic 75px Arial',
            certId: 'bold 55px Arial'
        }
    }
};

async function generateCertificate(name, course) {
    try {
        console.log('Starting certificate generation for:', { name, course });
        
        // Create canvas with A4 dimensions at 300 DPI
        const width = 3508; // Increased size for better quality
        const height = 2480; // Landscape orientation
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Set white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Add elegant gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, '#FFFFFF');
        bgGradient.addColorStop(0.5, '#F0F8FF');
        bgGradient.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Add main border with gradient
        const borderGradient = ctx.createLinearGradient(0, 0, width, 0);
        borderGradient.addColorStop(0, styles.professional.goldGradient[0]);
        borderGradient.addColorStop(0.5, styles.professional.goldGradient[1]);
        borderGradient.addColorStop(1, styles.professional.goldGradient[2]);

        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 30;
        ctx.strokeRect(60, 60, width - 120, height - 120);

        // Add inner border
        ctx.lineWidth = 5;
        ctx.strokeRect(100, 100, width - 200, height - 200);

        // Add header with shadow and gradient
        const headerGradient = ctx.createLinearGradient(width/2 - 800, 300, width/2 + 800, 300);
        headerGradient.addColorStop(0, styles.professional.blueGradient[0]);
        headerGradient.addColorStop(0.5, styles.professional.blueGradient[1]);
        headerGradient.addColorStop(1, styles.professional.blueGradient[2]);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 15;
        ctx.font = styles.professional.fonts.header;
        ctx.fillStyle = headerGradient;
        ctx.textAlign = 'center';
        ctx.fillText('Certificate of Completion', width/2, 380);
        ctx.shadowBlur = 0;

        // Add decorative line under header
        const lineY = 450;
        const lineLength = 1200;
        const lineStart = width/2 - lineLength/2;
        const lineEnd = width/2 + lineLength/2;

        const lineGradient = ctx.createLinearGradient(lineStart, lineY, lineEnd, lineY);
        lineGradient.addColorStop(0, 'rgba(212, 175, 55, 0)');
        lineGradient.addColorStop(0.2, styles.professional.goldGradient[0]);
        lineGradient.addColorStop(0.8, styles.professional.goldGradient[0]);
        lineGradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

        ctx.beginPath();
        ctx.moveTo(lineStart, lineY);
        ctx.lineTo(lineEnd, lineY);
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Add appreciation text with more spacing
        ctx.font = styles.professional.fonts.appreciation;
    ctx.fillStyle = styles.professional.textColor;
        ctx.fillText('This is to certify that', width/2, 580);

        // Add name with gradient and adjusted position
        const nameGradient = ctx.createLinearGradient(width/2 - 600, 800, width/2 + 600, 800);
        nameGradient.addColorStop(0, styles.professional.goldGradient[0]);
        nameGradient.addColorStop(0.5, styles.professional.goldGradient[1]);
        nameGradient.addColorStop(1, styles.professional.goldGradient[0]);

        ctx.font = styles.professional.fonts.name;
        ctx.fillStyle = nameGradient;
        ctx.fillText(name, width/2, 780);

        // Add course completion text with more spacing
        ctx.font = styles.professional.fonts.appreciation;
        ctx.fillStyle = styles.professional.textColor;
        ctx.fillText('has successfully completed the course', width/2, 940);

        // Add course name with gradient and adjusted position
        const courseGradient = ctx.createLinearGradient(width/2 - 700, 1100, width/2 + 700, 1100);
        courseGradient.addColorStop(0, styles.professional.blueGradient[0]);
        courseGradient.addColorStop(0.5, styles.professional.goldGradient[0]);
        courseGradient.addColorStop(1, styles.professional.blueGradient[0]);

        ctx.font = styles.professional.fonts.course;
        ctx.fillStyle = courseGradient;
        ctx.fillText(course, width/2, 1100);

        // Add achievement text with more spacing
        ctx.font = styles.professional.fonts.achievement;
    ctx.fillStyle = styles.professional.textColor;
        ctx.fillText('demonstrating exceptional dedication and mastery of the subject matter', width/2, 1280);

        // Add date with elegant style and adjusted position
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
        ctx.font = styles.professional.fonts.date;
        ctx.fillText(`Issued on ${date}`, width/2, 1450);

        // Add QR code with enhanced styling
    const certificateId = generateCertificateId(name, course);
    const qrCodeDataUrl = await QRCode.toDataURL(
        `https://sepolia.etherscan.io/address/${process.env.CONTRACT_ADDRESS}`,
        { 
            width: 300,
            margin: 2,
            color: {
                dark: '#000000', // Pure black for better contrast
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H',
            quality: 1.0 // Highest quality rendering
        }
    );
    const qrCodeImage = await loadImage(qrCodeDataUrl);

    // Draw QR code background and border with adjusted size
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(275, height - 525, 350, 350);
    ctx.shadowBlur = 0;

    const qrBorderGradient = ctx.createLinearGradient(275, height - 525, 625, height - 175);
    qrBorderGradient.addColorStop(0, styles.professional.goldGradient[0]);
    qrBorderGradient.addColorStop(1, styles.professional.goldGradient[1]);
    ctx.strokeStyle = qrBorderGradient;
    ctx.lineWidth = 4;
    ctx.strokeRect(275, height - 525, 350, 350);

    // Draw larger QR code with better positioning
    ctx.drawImage(qrCodeImage, 290, height - 510, 320, 320);

    // Add certificate ID next to QR code with improved styling
    const idGradient = ctx.createLinearGradient(650, height - 450, 1200, height - 450);
    idGradient.addColorStop(0, styles.professional.goldGradient[0]);
    idGradient.addColorStop(0.5, styles.professional.textColor);
    idGradient.addColorStop(1, styles.professional.goldGradient[0]);

    // Certificate ID label
    ctx.font = 'bold 35px "Montserrat", sans-serif';
    ctx.fillStyle = styles.professional.textColor;
    ctx.textAlign = 'left';  // Align text to left
    ctx.fillText('Certificate ID:', 650, height - 450);

    // Certificate ID value with enhanced styling
    ctx.font = 'bold 45px "Montserrat", sans-serif';
    ctx.fillStyle = idGradient;
    ctx.fillText(certificateId, 650, height - 400);
    
    // Reset text alignment to center for other elements
    ctx.textAlign = 'center';

    // Add combined branding (CertiChain X Antec) in bottom right corner
    const brandingGradient = ctx.createLinearGradient(width - 600, height - 250, width - 100, height - 250);
    brandingGradient.addColorStop(0, styles.professional.blueGradient[0]);
    brandingGradient.addColorStop(0.5, styles.professional.blueGradient[1]);
    brandingGradient.addColorStop(1, styles.professional.blueGradient[0]);
    
    ctx.font = 'bold 70px "Montserrat", sans-serif';
    ctx.fillStyle = brandingGradient;
    ctx.textAlign = 'right';  // Align text to right
    ctx.fillText('CERTICHAIN X ANTEC', width - 150, height - 250);
    
    // Reset text alignment
    ctx.textAlign = 'center';

    // Add watermark with enhanced font
    ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.translate(width/2, height/2);
        ctx.rotate(-Math.PI/6);
        ctx.font = 'bold 300px "Montserrat", sans-serif';
        ctx.fillStyle = styles.professional.borderColor;
        ctx.fillText('CERTICHAIN X ANTEC', 0, 0);
    ctx.restore();

        console.log('Certificate generation completed, converting to buffer...');

        // Convert to buffer with specific PNG settings
        const buffer = canvas.toBuffer('image/png', {
            compressionLevel: 6,
            filters: canvas.PNG_FILTER_NONE,
            resolution: 300
        });

        console.log('Buffer created successfully:', {
            size: buffer.length,
            type: 'image/png'
        });

        return buffer;
    } catch (error) {
        console.error('Error generating certificate:', error);
        throw new Error(`Certificate generation failed: ${error.message}`);
    }
}

function generateCertificateId(name, course) {
    const timestamp = Date.now().toString(36);
    const hash = Buffer.from(`${name}-${course}-${timestamp}`).toString('base64').slice(0, 8);
    return `CERT-${timestamp}-${hash}`.toUpperCase();
}

function generateQRCode(certificateId) {
    return QRCode.toDataURL(
        `https://sepolia.etherscan.io`,
        { 
            width: 300,
            margin: 1,
            color: {
                dark: styles.professional.textColor,
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        }
    );
}

export { generateCertificate }; 