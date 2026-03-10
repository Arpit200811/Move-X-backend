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
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("./models/User");
const Order_1 = require("./models/Order");
const Payment_1 = require("./models/Payment");
const Partner_1 = require("./models/Partner");
const Notification_1 = require("./models/Notification");
const Translation_1 = require("./models/Translation");
const Transaction_1 = require("./models/Transaction");
const AuditLog_1 = require("./models/AuditLog");
const Refund_1 = require("./models/Refund");
const TaxConfig_1 = require("./models/TaxConfig");
const GroupOrder_1 = require("./models/GroupOrder");
const Product_1 = require("./models/Product");
const Zone_1 = require("./models/Zone");
const Coupon_1 = require("./models/Coupon");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const isProd = process.env.NODE_ENV === "production" || process.env.DATABASE_URL;
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/movex",
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    synchronize: true, // Set to false in production and use migrations
    logging: false,
    entities: [User_1.User, Order_1.Order, Payment_1.Payment, Partner_1.Partner, Notification_1.Notification, Translation_1.Translation, Transaction_1.Transaction, AuditLog_1.AuditLog, Refund_1.Refund, TaxConfig_1.TaxConfig, GroupOrder_1.GroupOrder, Product_1.Product, Zone_1.Zone, Coupon_1.Coupon],
    subscribers: [],
    migrations: [],
});
//# sourceMappingURL=data-source.js.map