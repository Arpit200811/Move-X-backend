"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxConfig = void 0;
const typeorm_1 = require("typeorm");
/**
 * TaxConfig — Multi-Currency / Multi-Jurisdiction Tax Engine
 * Dynamically reads tax rates per country/region from the DB
 * rather than hardcoded static math.
 */
let TaxConfig = class TaxConfig {
    _id;
    countryCode; // 'IN', 'US', 'AE', 'GB' etc.
    countryName;
    currency; // 'INR', 'USD', 'AED', 'GBP'
    currencySymbol; // '₹', '$', 'د.إ', '£'
    baseFare; // Base fee for first 2-3km (e.g. 30 INR)
    perKmRate; // Rate per KM (e.g. 12 INR/km)
    perMinuteRate; // Rate per minute of travel (e.g. 2 INR/min)
    taxRate; // e.g. 18.0 for 18% GST
    taxName; // 'GST', 'VAT', 'Sales Tax'
    exchangeRateToUSD; // 1 USD = X of this currency
    isActive;
    serviceClassSurcharge; // { Economy: 0, Comfort: 5, Business: 10 } % surcharge
    updatedAt;
};
exports.TaxConfig = TaxConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxConfig.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], TaxConfig.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxConfig.prototype, "countryName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxConfig.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxConfig.prototype, "currencySymbol", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 30 }) // Updated default for India (Zomato/Swiggy style)
    ,
    __metadata("design:type", Number)
], TaxConfig.prototype, "baseFare", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 12 }) // Updated default for India (Zomato/Swiggy style)
    ,
    __metadata("design:type", Number)
], TaxConfig.prototype, "perKmRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 2 }) // Updated default for India (Zomato/Swiggy style)
    ,
    __metadata("design:type", Number)
], TaxConfig.prototype, "perMinuteRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], TaxConfig.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'GST' }),
    __metadata("design:type", String)
], TaxConfig.prototype, "taxName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 1.0 }),
    __metadata("design:type", Number)
], TaxConfig.prototype, "exchangeRateToUSD", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], TaxConfig.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Object)
], TaxConfig.prototype, "serviceClassSurcharge", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxConfig.prototype, "updatedAt", void 0);
exports.TaxConfig = TaxConfig = __decorate([
    (0, typeorm_1.Entity)('tax_configs')
], TaxConfig);
//# sourceMappingURL=TaxConfig.js.map