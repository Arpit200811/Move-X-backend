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
exports.Refund = void 0;
const typeorm_1 = require("typeorm");
/**
 * Refund — Dispute & Refund Workflow
 * Admin can issue Full Refund, Partial Refund, or Coupon Credit
 */
let Refund = class Refund {
    _id;
    orderId;
    customerId;
    originalAmount;
    refundAmount;
    refundType; // 'full' | 'partial' | 'coupon'
    couponCode; // generated coupon if refundType='coupon'
    status; // 'pending' | 'approved' | 'rejected' | 'processed'
    reason; // Customer complaint reason
    adminNote; // Admin internal notes
    processedBy; // Admin userId
    stripeRefundId; // Stripe refund reference
    createdAt;
};
exports.Refund = Refund;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Refund.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Refund.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Refund.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Refund.prototype, "originalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Refund.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'full' }),
    __metadata("design:type", String)
], Refund.prototype, "refundType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Refund.prototype, "couponCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], Refund.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Refund.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Refund.prototype, "adminNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Refund.prototype, "processedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Refund.prototype, "stripeRefundId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Refund.prototype, "createdAt", void 0);
exports.Refund = Refund = __decorate([
    (0, typeorm_1.Entity)('refunds')
], Refund);
//# sourceMappingURL=Refund.js.map