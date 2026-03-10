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
exports.GroupOrder = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Order_1 = require("./Order");
/**
 * GroupOrder — Collaborative / Split Ordering
 * Allows multiple users to join a single session and split costs.
 */
let GroupOrder = class GroupOrder {
    _id;
    inviteCode; // 6-digit code for others to join
    creator;
    status; // 'OPEN' | 'LOCKED' | 'PLACED'
    members; // Array of { userId, name, avatar, joinedAt }
    cart; // Combined cart items from everyone
    totalAmount;
    splitMethod; // 'split_even' | 'pay_individual' | 'host_pays'
    resultOrders; // The actual order(s) created from this group session
    createdAt;
};
exports.GroupOrder = GroupOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GroupOrder.prototype, "_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], GroupOrder.prototype, "inviteCode", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'creatorId' }),
    __metadata("design:type", User_1.User)
], GroupOrder.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'OPEN' }),
    __metadata("design:type", String)
], GroupOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], GroupOrder.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], GroupOrder.prototype, "cart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], GroupOrder.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'split_even' }),
    __metadata("design:type", String)
], GroupOrder.prototype, "splitMethod", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Order_1.Order, (order) => order._id),
    __metadata("design:type", Array)
], GroupOrder.prototype, "resultOrders", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GroupOrder.prototype, "createdAt", void 0);
exports.GroupOrder = GroupOrder = __decorate([
    (0, typeorm_1.Entity)('group_orders')
], GroupOrder);
//# sourceMappingURL=GroupOrder.js.map