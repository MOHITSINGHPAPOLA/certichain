 CONFIG = {
    API_URL: 'http://192.168.56.1:5001/api/nft',
}
// Initialize global variables
let web3;
let contract;
let userAddress;
const contractAddress = '0x96A106C2489E799257AcB985aE0e15552982bf81';
const contractABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "ERC721IncorrectOwner",
        "type": "error"
    },
    // ... rest of your ABI ...
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "tokenURI",
                "type": "string"
            }
        ],
        "name": "mintCertificate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // ... rest of your ABI ...
    {
        "stateMutability": "payable",
        "type": "receive"
    }
];

// Backend API URL
const API_URL = 'http://localhost:5001/api/nft';

// Sepolia Network Configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in decimal
const SEPOLIA_NETWORK_PARAMS = {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'], // Public RPC
    blockExplorerUrls: ['https://sepolia.etherscan.io/']
};

// Connect to the Ethereum network
async function connectWallet() {
    try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            alert('Please install MetaMask!');
            return;
        }

        // Show loading state
        const connectBtn = document.getElementById('connectWalletBtn');
        connectBtn.classList.add('loading');
        connectBtn.textContent = 'Connecting...';

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];

        // Initialize Web3
        web3 = new Web3(window.ethereum);
        
        // Initialize contract
        contract = new web3.eth.Contract(contractABI, contractAddress);

        // Check network and switch to Sepolia if needed
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== SEPOLIA_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }]
                });
            } catch (switchError) {
                // If Sepolia is not added, add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [SEPOLIA_NETWORK_PARAMS]
                        });
                    } catch (addError) {
                        throw new Error('Failed to add Sepolia network');
                    }
                } else {
                    throw switchError;
                }
            }
        }

        // Update UI
        connectBtn.classList.remove('loading');
        connectBtn.innerHTML = `<i class="fas fa-wallet"></i> Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        connectBtn.classList.add('connected');
        
        // Enable form elements
        document.getElementById('certificateName').disabled = false;
        document.getElementById('courseName').disabled = false;
        document.getElementById('recipientAddress').value = userAddress;
        
        console.log('Wallet connected:', userAddress);
        return userAddress;

    } catch (error) {
        console.error('Connection error:', error);
        const connectBtn = document.getElementById('connectWalletBtn');
        connectBtn.classList.remove('loading');
        connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Failed';
        alert('Failed to connect wallet: ' + error.message);
    }
}

// Update the preview function to handle URLs
function showCertificatePreview(imageBlob) {
    console.log('Showing certificate preview for blob:', { size: imageBlob.size, type: imageBlob.type });
    
    // Get the preview section
    const previewSection = document.querySelector('.preview-section');
    if (!previewSection) {
        console.error('Preview section not found');
        return;
    }
    
    // Clear any existing content
    previewSection.innerHTML = '';
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.id = 'certificatePreview';
    previewContainer.style.width = '100%';
    previewContainer.style.maxWidth = '1000px';
    previewContainer.style.margin = '0 auto';
    previewContainer.style.padding = '20px';
    previewContainer.style.background = '#ffffff';
    previewContainer.style.borderRadius = '12px';
    previewContainer.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
    
    // Create and set up image element
    const previewImage = document.createElement('img');
    previewImage.style.width = '100%';
    previewImage.style.height = 'auto';
    previewImage.style.borderRadius = '8px';
    previewImage.style.display = 'block';
    
    // Create loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading preview...';
    previewContainer.appendChild(loadingDiv);
    
    // Set up image loading handlers
    previewImage.onload = () => {
        console.log('Preview image loaded successfully');
        previewContainer.innerHTML = ''; // Clear loading indicator
        previewContainer.appendChild(previewImage);
        
        // Store the blob for later use
        window.certificateBlob = imageBlob;
    };
    
    previewImage.onerror = (error) => {
        console.error('Error loading preview image:', error);
        previewContainer.innerHTML = '<div class="error">Error loading certificate preview</div>';
    };
    
    // Create object URL and set image source
    const objectUrl = URL.createObjectURL(imageBlob);
    console.log('Created object URL for preview:', objectUrl);
    previewImage.src = objectUrl;
    
    // Clean up old object URL when done
    const oldObjectUrl = previewContainer.dataset.objectUrl;
    if (oldObjectUrl) {
        URL.revokeObjectURL(oldObjectUrl);
    }
    previewContainer.dataset.objectUrl = objectUrl;
    
    // Add the preview container to the preview section
    previewSection.appendChild(previewContainer);
}

// Add this function to automatically generate prompts
function generateAutomaticPrompt(certificateName, courseName) {
    const styles = [
        "elegant and professional",
        "modern and minimalist",
        "luxurious with golden accents",
        "classic academic style",
        "innovative and tech-inspired"
    ];

    const backgrounds = [
        "gradient background",
        "abstract geometric patterns",
        "subtle marble texture",
        "digital blockchain motifs",
        "soft professional background"
    ];

    // Randomly select style and background
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];

    return `A ${randomStyle} certificate design for ${courseName} certification with ${randomBackground}, featuring professional borders and an official seal. High quality, detailed, professional certificate design`;
}

// Add thumbnail image input field to the form
let thumbnailBlob = null;

async function handleThumbnailUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file (jpg, jpeg, png, gif)');
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('Image size must be less than 5MB');
        }

        // Create an image element to check dimensions
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));
        });

        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate dimensions for a square crop
        let size = Math.min(img.width, img.height);
        let x = (img.width - size) / 2;
        let y = (img.height - size) / 2;

        // Set canvas size to desired dimensions (350x350)
        canvas.width = 350;
        canvas.height = 350;

        // Draw the cropped and resized image
        ctx.fillStyle = '#FFFFFF'; // White background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, size, size, 0, 0, 350, 350);

        // Convert to blob with high quality
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
        thumbnailBlob = blob;
        
        console.log('Thumbnail prepared:', {
            size: blob.size,
            type: blob.type,
            dimensions: '350x350'
        });
        
        // Show preview
        const preview = document.getElementById('thumbnailPreview');
        if (preview) {
            preview.src = URL.createObjectURL(blob);
            preview.style.display = 'block';
        }

        // Clean up
        URL.revokeObjectURL(img.src);

    } catch (error) {
        console.error('Error processing thumbnail:', error);
        alert(error.message || 'Error processing thumbnail image. Please try another image.');
        
        // Reset the file input
        event.target.value = '';
        
        // Hide preview if it exists
        const preview = document.getElementById('thumbnailPreview');
        if (preview) {
            preview.style.display = 'none';
        }
        
        thumbnailBlob = null;
    }
}

// Update mintCertificate function to include thumbnail upload
async function mintCertificate() {
    const mintBtn = document.getElementById('mintCertificateBtn');
    const statusElement = document.getElementById('mintStatus');
    const certificateForm = document.getElementById('certificateForm');
    const certificatePreview = document.getElementById('certificatePreview');

    try {
        if (!web3 || !userAddress) {
            throw new Error('Please connect your wallet first');
        }

        const recipientAddress = document.getElementById('recipientAddress')?.value;
        if (!recipientAddress) {
            throw new Error('Please enter a recipient address');
        }

        if (!thumbnailBlob) {
            throw new Error('Please upload a thumbnail image for the NFT');
        }

        // Get the stored metadata URL
        const storedData = loadCertificateData();
        const metadataURL = storedData.metadata;

        console.log('Starting minting process with data:', {
            hasStoredData: !!storedData,
            hasMetadataURL: !!metadataURL,
            metadataURL: metadataURL,
            hasThumbnail: !!thumbnailBlob,
            thumbnailSize: thumbnailBlob?.size,
            thumbnailType: thumbnailBlob?.type
        });

        if (!metadataURL) {
            throw new Error('Certificate design not ready. Please generate and upload the certificate first.');
        }

        // Upload thumbnail first
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', thumbnailBlob, 'thumbnail.png');

        console.log('Uploading thumbnail...', {
            formDataSize: thumbnailFormData.get('file').size,
            formDataType: thumbnailFormData.get('file').type
        });

        const thumbnailResponse = await fetch(`${CONFIG.API_URL}/ipfs/upload-thumbnail`, {
            method: 'POST',
            body: thumbnailFormData
        });

        const thumbnailResult = await thumbnailResponse.text();
        console.log('Raw thumbnail response:', thumbnailResult);

        if (!thumbnailResponse.ok) {
            throw new Error(`Failed to upload thumbnail: ${thumbnailResult}`);
        }

        const thumbnailData = JSON.parse(thumbnailResult);
        console.log('Thumbnail uploaded:', thumbnailData);

        if (!thumbnailData.success || !thumbnailData.url) {
            throw new Error('Invalid response from thumbnail upload');
        }

        // Ensure we have full URLs
        const thumbnailUrl = thumbnailData.url.startsWith('http') 
            ? thumbnailData.url 
            : `${window.location.protocol}//${window.location.host}${thumbnailData.url}`;
        
        const certificateUrl = metadataURL.startsWith('http')
            ? metadataURL
            : `${window.location.protocol}//${window.location.host}${metadataURL}`;

        // Create metadata with both certificate and thumbnail URLs
        const metadata = {
            name: document.getElementById('certificateName').value,
            description: `Certificate for ${document.getElementById('courseName').value}`,
            image: thumbnailUrl,
            certificate_url: certificateUrl
        };

        console.log('Creating metadata with URLs:', {
            thumbnailUrl,
            certificateUrl
        });

        // Upload metadata
        const metadataResponse = await fetch(`${CONFIG.API_URL}/ipfs/upload-metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        if (!metadataResponse.ok) {
            throw new Error('Failed to upload metadata');
        }

        const metadataResult = await metadataResponse.json();
        const finalMetadataURL = metadataResult.url.startsWith('http')
            ? metadataResult.url
            : `${window.location.protocol}//${window.location.host}${metadataResult.url}`;

        console.log('Using metadata URL:', finalMetadataURL);

        if (mintBtn) {
            mintBtn.disabled = true;
            mintBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Minting...';
        }
        if (statusElement) {
            statusElement.textContent = 'Minting... Please wait...';
            statusElement.className = 'status';
        }

        try {
            // Extract the filename from the URL
            const fileName = finalMetadataURL.split('/').pop();
            
            // Verify the certificate exists using a separate endpoint
            const verifyResponse = await fetch(`${CONFIG.API_URL}/ipfs/verify/${fileName}`);
            if (!verifyResponse.ok) {
                throw new Error('Certificate not found. Please generate again.');
            }

            const result = await contract.methods
                .mintCertificate(recipientAddress, finalMetadataURL)
                .send({ from: userAddress });

            console.log('Minting successful:', result);
            
            // Safely update UI elements
            if (statusElement) {
                statusElement.textContent = 'Certificate minted successfully!';
                statusElement.className = 'status success';
            }
            
            // Clear form and reset UI after successful mint
            if (certificateForm) {
                certificateForm.reset();
            }
            if (certificatePreview) {
                certificatePreview.style.display = 'none';
            }
            if (mintBtn) {
                mintBtn.style.display = 'none';
            }
            
            // Clear stored certificate data
            sessionStorage.removeItem('certificateBlob');
            sessionStorage.removeItem('certificateUrl');
            sessionStorage.removeItem('metadataURL');

            // Show success message that stays visible
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.innerHTML = `
                <i class="fas fa-check-circle"></i>
                Certificate minted successfully!<br>
                Transaction Hash: <a href="https://sepolia.etherscan.io/tx/${result.transactionHash}" target="_blank">
                    ${result.transactionHash.substring(0, 10)}...
                </a>
            `;
            
            // Insert the success message after the form
            if (certificateForm) {
                certificateForm.parentNode.insertBefore(successMessage, certificateForm.nextSibling);
            }

        } catch (mintError) {
            console.error('Minting transaction failed:', mintError);
            if (statusElement) {
                statusElement.textContent = 'Minting failed: ' + mintError.message;
                statusElement.className = 'status error';
            }
            throw mintError;
        }
    } catch (error) {
        console.error('Minting process failed:', error);
        if (statusElement) {
            statusElement.textContent = 'Minting failed: ' + error.message;
            statusElement.className = 'status error';
        }
    } finally {
        if (mintBtn) {
            mintBtn.disabled = false;
            mintBtn.innerHTML = '<i class="fas fa-certificate"></i> Mint Certificate';
        }
    }
}

let certificateUrl = null;
let certificateBlob = null;

async function generateCertificateBackground() {
    const generateBtn = document.getElementById('generateBtn');
    const mintBtn = document.getElementById('mintCertificateBtn');
    const statusMessage = document.getElementById('mintStatus');
    
    // Disable the generate button and show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
    try {
        const name = document.getElementById('certificateName').value;
        const course = document.getElementById('courseName').value;
        
        if (!name || !course) {
            throw new Error('Please fill in all required fields');
        }
        
        // Generate the certificate
        const response = await fetch(`${CONFIG.API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, course })
        });

        if (!response.ok) {
            throw new Error('Failed to generate certificate');
        }

        const blob = await response.blob();
        console.log('Received certificate blob:', { size: blob.size, type: blob.type });

        // Store the blob for preview
        certificateBlob = blob;
        certificateUrl = URL.createObjectURL(blob);

        // Upload to MongoDB storage
        const formData = new FormData();
        formData.append('file', blob, 'certificate.png');

        console.log('Uploading certificate to storage...');
        const uploadResponse = await fetch(`${CONFIG.API_URL}/ipfs/upload`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload certificate to storage');
        }
        
        const uploadData = await uploadResponse.json();
        
        if (!uploadData.success || !uploadData.url) {
            throw new Error('Invalid response from storage upload');
        }

        // Store the metadata URL
        metadataURL = uploadData.url;
        console.log('Metadata URL:', metadataURL);
        
        // Store certificate data in session storage
        storeCertificateData(certificateBlob, certificateUrl, metadataURL);

        // Update UI to show success
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-eye"></i> Preview Certificate';
        generateBtn.className = 'preview-btn';
        generateBtn.onclick = previewCertificate;

        // Show mint button
        mintBtn.style.display = 'block';
        mintBtn.disabled = false;
        
        // Update status message
        statusMessage.textContent = 'Certificate generated and stored successfully! Ready to mint.';
        statusMessage.className = 'status-message success';
    } catch (error) {
        console.error('Error:', error);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Design';
        statusMessage.textContent = 'Failed to generate certificate: ' + error.message;
        statusMessage.className = 'status-message error';
        
        // Hide mint button on error
        mintBtn.style.display = 'none';
    }
}

function storeCertificateData(blob, url, metadata) {
    try {
        // Store metadata URL as is
        sessionStorage.setItem('metadataURL', metadata);
        
        // Store URL for preview
        sessionStorage.setItem('certificateUrl', url);
        
        // Store blob data
        const blobData = {
            size: blob.size,
            type: blob.type,
            lastModified: blob.lastModified
        };
        sessionStorage.setItem('certificateBlob', JSON.stringify(blobData));
        
        console.log('Certificate data stored successfully:', {
            hasMetadata: !!metadata,
            hasUrl: !!url,
            blobInfo: blobData
        });
    } catch (error) {
        console.error('Error storing certificate data:', error);
    }
}

function loadCertificateData() {
    const blob = JSON.parse(sessionStorage.getItem('certificateBlob'));
    const url = sessionStorage.getItem('certificateUrl');
    const metadata = sessionStorage.getItem('metadataURL');
    return { blob, url, metadata };
}

function previewCertificate() {
    if (certificateUrl) {
        window.open(certificateUrl, '_blank');
    }
}

// Clean up object URLs when the page is unloaded
window.addEventListener('unload', () => {
    if (certificateUrl) {
        URL.revokeObjectURL(certificateUrl);
    }
});

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Connect wallet button
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }

    // Generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateCertificateBackground);
    }

    // Mint button
    const mintBtn = document.getElementById('mintCertificateBtn');
    if (mintBtn) {
        mintBtn.addEventListener('click', mintCertificate);
    }

    // Event handlers for MetaMask
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                userAddress = null;
                const connectBtn = document.getElementById('connectWalletBtn');
                if (connectBtn) {
                    connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
                    connectBtn.classList.remove('connected');
                }
                // Disable form elements
                const certificateNameInput = document.getElementById('certificateName');
                const courseNameInput = document.getElementById('courseName');
                const recipientAddressInput = document.getElementById('recipientAddress');
                if (certificateNameInput) certificateNameInput.disabled = true;
                if (courseNameInput) courseNameInput.disabled = true;
                if (recipientAddressInput) recipientAddressInput.value = '';
            } else {
                userAddress = accounts[0];
                const connectBtn = document.getElementById('connectWalletBtn');
                if (connectBtn) {
                    connectBtn.innerHTML = `<i class="fas fa-wallet"></i> Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
                    connectBtn.classList.add('connected');
                }
            }
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });

        window.ethereum.on('disconnect', () => {
            console.log('Wallet disconnected');
            userAddress = null;
            const connectBtn = document.getElementById('connectWalletBtn');
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
                connectBtn.classList.remove('connected');
            }
            // Disable form elements
            const certificateNameInput = document.getElementById('certificateName');
            const courseNameInput = document.getElementById('courseName');
            const recipientAddressInput = document.getElementById('recipientAddress');
            if (certificateNameInput) certificateNameInput.disabled = true;
            if (courseNameInput) courseNameInput.disabled = true;
            if (recipientAddressInput) recipientAddressInput.value = '';
        });
    }
});

// Add these functions to your frontend.js

// Function to test the connection
async function testInfuraConnection() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/ipfs/test`);
        const data = await response.json();
        console.log('Infura connection test:', data);
        return data.status === 'ok';
    } catch (error) {
        console.error('Infura connection test failed:', error);
        return false;
    }
}

// Update the upload function
async function uploadToIPFS(imageBlob) {
    try {
        console.log('Starting uploadToIPFS function');
        
        if (!imageBlob || imageBlob.size === 0) {
            throw new Error('Invalid image blob: Empty or null');
        }

        console.log('Image blob validation passed:', {
            blobSize: imageBlob.size,
            blobType: imageBlob.type,
            blobContent: imageBlob instanceof Blob ? 'Valid Blob' : 'Not a Blob'
        });

        const formData = new FormData();
        const file = new File([imageBlob], 'certificate.png', { 
            type: 'image/png',
            lastModified: Date.now()
        });
        formData.append('file', file);

        console.log('FormData created:', {
            hasFile: formData.has('file'),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        });

        const uploadUrl = `${CONFIG.API_URL}/ipfs/upload`;
        console.log('Preparing to send request to:', uploadUrl);
        console.log('Config:', {
            apiUrl: CONFIG.API_URL,
            fullUrl: uploadUrl
        });

        try {
            console.log('Initiating fetch request...');
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
                mode: 'cors',
                credentials: 'omit',
            headers: {
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                }
            });

            console.log('Response received:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers])
            });

        if (!response.ok) {
            const text = await response.text();
                console.error('Upload failed with status:', response.status);
                console.error('Response text:', text);
            throw new Error(`Upload failed: ${response.status} - ${text}`);
        }

            let data;
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            try {
                data = JSON.parse(responseText);
        console.log('Upload successful:', data);
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                console.error('Response text was:', responseText);
                throw new Error('Invalid response format from server');
            }

        if (!data.url) {
                console.error('Missing URL in response:', data);
                throw new Error('No URL in response from server');
        }

        return data.url;
        } catch (fetchError) {
            console.error('Fetch operation failed:', {
                error: fetchError,
                message: fetchError.message,
                type: fetchError.type,
                name: fetchError.name,
                url: uploadUrl
            });
            throw new Error(`Failed to upload to IPFS: ${fetchError.message}`);
        }
    } catch (error) {
        console.error('Upload error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            phase: 'uploadToIPFS function'
        });
        throw error;
    }
}

// Update test function
async function testSimpleUpload() {
    try {
        const blob = new Blob(['Test content'], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', new File([blob], 'test.txt'));

        const response = await fetch(`${CONFIG.API_URL}/pinning/pinFileToIPFS`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.PINATA_CONFIG.jwt}`
            },
            body: formData
        });

        console.log('Test upload response:', {
            status: response.status,
            headers: Object.fromEntries([...response.headers])
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Test upload failed: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('Test upload successful:', data);
        return data;
    } catch (error) {
        console.error('Test upload failed:', error);
        throw error;
    }
}

// Function to create and upload metadata
async function createMetadata(imageUrl, name, course) {
    try {
        console.log('Creating metadata for:', { name, course, imageUrl });
        
        // Standard ERC721 Metadata structure
        const metadata = {
            name: `${name}'s ${course} Certificate`, // Token name
            description: `This certificate is awarded to ${name} for successfully completing the ${course} course. Issued by CertiChain.`, // Token description
            image: imageUrl, // IPFS URL of the certificate image
            attributes: [
                {
                    trait_type: "Course",
                    value: course
                },
                {
                    trait_type: "Recipient",
                    value: name
                },
                {
                    trait_type: "Issue Date",
                    value: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                },
                {
                    trait_type: "Issuer",
                    value: "CertiChain"
                },
                {
                    trait_type: "Verification Status",
                    value: "Verified"
                }
            ],
            // Additional metadata
            background_color: "", // Optional: Hexadecimal color without #
            external_url: "", // Optional: External URL for the certificate
            animation_url: "", // Optional: URL to any animation
        };

        // Create form data
        const formData = new FormData();
        const file = new File(
            [JSON.stringify(metadata, null, 2)], // Pretty print JSON
            'metadata.json', 
            { type: 'application/json' }
        );
        formData.append('file', file);

        // Add pinata metadata for better organization
        const pinataMetadata = JSON.stringify({
            name: `${name}_${course}_metadata.json`,
            keyvalues: {
                type: "certificate",
                course: course,
                recipient: name,
                issueDate: new Date().toISOString(),
                platform: "CertiChain"
            }
        });
        formData.append('pinataMetadata', pinataMetadata);

        console.log('Uploading metadata to IPFS...');
        const url = `${API_URL}/pinning/pinFileToIPFS`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.PINATA.jwt}`
            },
            body: formData
        });

        console.log('Metadata upload response:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Metadata upload error:', text);
            throw new Error(`Metadata Upload Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('Metadata upload successful:', data);
        
        const metadataUrl = `ipfs://${data.IpfsHash}`;
        console.log('Metadata URL:', metadataUrl);
        return metadataUrl;

    } catch (error) {
        console.error('Metadata creation error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause
        });
        throw error;
    }
}

// Add this function to test Pinata connection
async function testPinataConnection() {
    try {
        const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.PINATA.jwt}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Pinata connection test successful:', data);
        return true;
    } catch (error) {
        console.error('Pinata connection test failed:', error);
        return false;
    }
}

async function testIPFSConnection() {
    try {
        const formData = new FormData();
        const testFile = new Blob(['Hello, IPFS!'], { type: 'text/plain' });
        formData.append('file', new File([testFile], 'test.txt'));

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': CONFIG.PINATA.apiKey,
                'pinata_secret_api_key': CONFIG.PINATA.apiSecret
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`IPFS Test Error: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('IPFS Test successful:', data);
        return data;
    } catch (error) {
        console.error('IPFS connection test failed:', error);
        throw error;
    }
}

// Add this check before uploading
async function checkPinataConnection() {
    try {
        const response = await fetch(`${API_URL}/ipfs/test`, {
            method: 'GET',
            headers: CONFIG.CORS_HEADERS
        });
        
        if (!response.ok) {
            throw new Error('Failed to connect to IPFS service');
        }
        
        return true;
    } catch (error) {
        console.error('IPFS connection test failed:', error);
        return false;
    }
} 
