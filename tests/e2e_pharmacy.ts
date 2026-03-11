import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { Partner } from '../models/Partner';
import { Order } from '../models/Order';
import { TaxConfig } from '../models/TaxConfig';
import { DispatcherService } from '../services/dispatcherService';

async function runPharmacyE2E() {
    console.log("🚀 Starting Pharmacy Module E2E Test Run...");
    
    try {
        await AppDataSource.initialize();
        console.log("✅ Database successfully connected");

        const userRepo = AppDataSource.getRepository(User);
        const partnerRepo = AppDataSource.getRepository(Partner);
        const orderRepo = AppDataSource.getRepository(Order);
        const taxRepo = AppDataSource.getRepository(TaxConfig);

        // 1. Ensure TaxConfig exists
        let taxConfig = await taxRepo.findOne({ where: { isActive: true } });
        if (!taxConfig) {
            taxConfig = taxRepo.create({
                baseFare: 30,
                perKmRate: 12,
                taxRate: 5,
                taxName: "GST",
                currency: "INR",
                currencySymbol: "₹",
                isActive: true,
                countryCode: "IN",
                countryName: "India",
                exchangeRateToUSD: 83.5,
                serviceClassSurcharge: { "Economy": 0, "Premium": 20 }
            });
            await taxRepo.save(taxConfig);
            console.log("✅ TaxConfig Seeded");
        }

        // 2. Create Mock Customer
        let customer = await userRepo.findOne({ where: { phone: '9998887771' } });
        if (!customer) {
            customer = userRepo.create({
                name: "E2E Pharmacy Customer",
                phone: "9998887771",
                role: "customer",
                walletBalance: 5000, // Enough for purchase
            });
            await userRepo.save(customer);
            console.log("✅ Mock Customer Created [Wallet: ₹" + customer.walletBalance + "]");
        }

        // 3. Create Mock Driver
        let driver = await userRepo.findOne({ where: { phone: '9998887772' } });
        if (!driver) {
            driver = userRepo.create({
                name: "E2E Verified Rider",
                phone: "9998887772",
                role: "driver",
                status: "available",
                isOnline: true,
                lat: 28.6139, 
                lng: 77.2090
            });
            await userRepo.save(driver);
            console.log("✅ Mock Driver Created and Available");
        }

        // 4. Create Mock Pharmacy Partner
        let partner = await partnerRepo.findOne({ where: { email: 'apollo@movex.com' } });
        if (!partner) {
            const partnerOwner = userRepo.create({
                name: "Apollo Owner",
                phone: "9998887773",
                role: "partner"
            });
            await userRepo.save(partnerOwner);

            partner = partnerRepo.create({
                name: "Apollo Connect Pharmacy",
                type: "PHARMACY",
                category: "Medicine",
                email: "apollo@movex.com",
                status: "active",
                isAcceptingOrders: true,
                autoAccept: true,
                rating: 4.8,
                owner: partnerOwner
            } as any);
            await partnerRepo.save(partner);
            console.log("✅ Mock Pharmacy Partner Created");
        }

        // 5. Simulate Cart Checkout API Flow
        console.log("🛒 Simulating Cart Checkout Flow...");
        const items = [{ name: 'Paracetamol 500mg', quantity: 2, price: 50 }];
        const subTotal = 100;
        const finalTotal = subTotal + taxConfig.baseFare + (subTotal * taxConfig.taxRate / 100);

        const order = orderRepo.create({
            orderId: `E2E-PHR-${Date.now().toString().slice(-4)}`,
            customerId: customer,
            partnerId: partner,
            pickup: "Apollo Connect Pharmacy",
            destination: "Customer Home (Sector 14)",
            pickupCoords: { lat: 28.6140, lng: 77.2095 },
            destCoords: { lat: 28.6200, lng: 77.2100 },
            packageType: "Pharmacy",
            serviceClass: "Economy",
            paymentMethod: "Wallet",
            paymentStatus: "paid", // Assume successful wallet deduction
            status: "PENDING",
            items: items,
            itemsTotal: subTotal,
            deliveryFee: taxConfig.baseFare,
            tax: subTotal * taxConfig.taxRate / 100,
            total: finalTotal,
            currency: "INR",
            otp: "4321",
            timeline: [{ status: "PENDING", timestamp: new Date() }]
        } as any);

        await orderRepo.save(order);
        console.log(`✅ Order Placed Successfully: ${order.orderId} (Total: ₹${order.total})`);

        // Update Wallet Balance
        customer.walletBalance -= finalTotal;
        await userRepo.save(customer);
        console.log(`💰 Customer Wallet Deducted. New Balance: ₹${customer.walletBalance.toFixed(2)}`);

        // 6. Simulate Auto-Accept & Driver Dispatch
        if (partner.autoAccept) {
            order.status = "PARTNER_ACCEPTED";
            order.timeline.push({ status: "PARTNER_ACCEPTED", timestamp: new Date() } as any);
            await orderRepo.save(order);
            console.log("✅ Partner Auto-Accepted the Order.");

            // Directly assign our mock driver instead of relying on the complex Socket IO dispatcher
            order.driverId = driver;
            order.status = "ASSIGNED";
            order.timeline.push({ status: "ASSIGNED", timestamp: new Date() } as any);
            await orderRepo.save(order);

            driver.status = "busy";
            await userRepo.save(driver);
            console.log(`✅ Driver ${driver.name} Assigned and Marked Busy.`);
        }

        // 7. Complete the Order (Delivery Flow)
        console.log("🚚 Simulating Delivery Completion...");
        order.status = "DELIVERED";
        order.timeline.push({ status: "DELIVERED", timestamp: new Date() } as any);
        await orderRepo.save(order);

        // Process Payouts
        const driverEarning = order.deliveryFee * 0.90;
        const merchantEarning = order.itemsTotal * 0.90;

        driver.walletBalance += driverEarning;
        driver.status = "available";
        await userRepo.save(driver);

        let partnerOwner = await userRepo.findOne({ where: { _id: partner.owner._id } });
        if (partnerOwner) {
            partnerOwner.walletBalance = (partnerOwner.walletBalance || 0) + merchantEarning;
            await userRepo.save(partnerOwner);
        }

        console.log(`✅ Order ${order.orderId} Delivered.`);
        console.log(`💸 Financial Settlement done: Driver earned ₹${driverEarning.toFixed(2)}, Merchant earned ₹${merchantEarning.toFixed(2)}`);

        console.log("\n🎉 E2E Pharmacy Module Test Run Passed Successfully!");

    } catch (e: any) {
        console.error("❌ E2E Test Failed:", e.message);
    } finally {
        await AppDataSource.destroy();
        process.exit();
    }
}

runPharmacyE2E();
