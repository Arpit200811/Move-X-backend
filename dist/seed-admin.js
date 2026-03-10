"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const data_source_1 = require("./data-source");
const User_1 = require("./models/User");
dotenv.config();
const ADMIN_PHONE = '9999999999';
const ADMIN_NAME = 'Super Admin';
async function seedAdmin() {
    try {
        await data_source_1.AppDataSource.initialize();
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const existing = await userRepository.findOne({ where: { phone: ADMIN_PHONE } });
        if (existing) {
            if (existing.role === 'admin') {
                console.log(`✅ Admin already exists: ${existing.name} (${existing.phone})`);
            }
            else {
                existing.role = 'admin';
                existing.name = ADMIN_NAME;
                existing.status = 'online';
                await userRepository.save(existing);
                console.log(`✅ Existing user upgraded to admin: ${ADMIN_PHONE}`);
            }
        }
        else {
            const admin = userRepository.create({
                phone: ADMIN_PHONE,
                name: ADMIN_NAME,
                role: 'admin',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`,
                status: 'online',
                isOnline: false,
            });
            await userRepository.save(admin);
            console.log(`✅ Admin created successfully!`);
            console.log(`   Phone : ${ADMIN_PHONE}`);
            console.log(`   Name  : ${ADMIN_NAME}`);
        }
        console.log('\n🔐 Admin can now login at: http://localhost:5173/login');
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
}
seedAdmin();
//# sourceMappingURL=seed-admin.js.map