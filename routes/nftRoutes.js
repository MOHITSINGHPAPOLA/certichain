import express from 'express';
import { generateNFT } from '../controllers/nftController.js';

const router = express.Router();

// Generate NFT certificate
router.post('/generate', generateNFT);

export default router;
