import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./models/User";
import { Order } from "./models/Order";
import { Payment } from "./models/Payment";
import { Partner } from "./models/Partner";
import { Notification } from "./models/Notification";
import { Translation } from "./models/Translation";
import { Transaction } from "./models/Transaction";
import { AuditLog } from "./models/AuditLog";
import { Refund } from "./models/Refund";
import { TaxConfig } from "./models/TaxConfig";
import { GroupOrder } from "./models/GroupOrder";
import { Product } from "./models/Product";
import { Zone } from "./models/Zone";
import { Coupon } from "./models/Coupon";
import { Banner } from "./models/Banner";
import { VehicleType } from "./models/VehicleType";
import * as dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production" || process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/movex",
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    synchronize: true, // Set to false in production and use migrations
    logging: false,
    entities: [User, Order, Payment, Partner, Notification, Translation, Transaction, AuditLog, Refund, TaxConfig, GroupOrder, Product, Zone, Coupon, Banner, VehicleType],
    subscribers: [],
    migrations: [],
});
