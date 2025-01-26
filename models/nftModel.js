import mongoose from 'mongoose';

const nftSchema = new mongoose.Schema({
  userAddress: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  imageUrl: { type: String, required: true },
  metadataUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('NFT', nftSchema);
