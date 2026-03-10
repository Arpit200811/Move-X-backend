"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const uuid_1 = require("uuid");
/**
 * Cloudinary / S3 Enterprise Upload Abstract Layer
 * Connects to S3/Cloudinary bucket.
 * Mocking with local storage for demo, but structured for real cloud.
 */
class UploadService {
    static async uploadToCloud(file) {
        if (!file)
            return null;
        // In Production: 
        // 1. S3: s3.upload({ Bucket: 'movex-kyc', Key: uuidv4(), Body: file.buffer })
        // 2. Cloudinary: cloudinary.v2.uploader.upload_stream({ folder: 'kyc' }, (err, result) => ...)
        console.log(`[ENTERPRISE STORAGE] Securely uploading ${file.originalname} to MoveX Cloud...`);
        // Simulating 800ms network latency to external storage
        await new Promise(r => setTimeout(r, 800));
        // Mocking Cloudinary/S3 URL
        const mockUrl = `https://storage.movex.global/kyc/unverified/${(0, uuid_1.v4)()}_${file.originalname}`;
        return mockUrl;
    }
    static async getSignedUrl(key) {
        // Mocking secure expiring S3 Signed URL for Admin viewing sensitive docs
        return `https://storage.movex.global/signed-access/${key}?token=MOCK_EXPIRES_60S`;
    }
}
exports.UploadService = UploadService;
//# sourceMappingURL=uploadService.js.map