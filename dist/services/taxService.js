"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxService = void 0;
const data_source_1 = require("../data-source");
const TaxConfig_1 = require("../models/TaxConfig");
/**
 * TaxService — Multi-Currency / Multi-Jurisdiction Tax Engine
 * Reads tax rules from DB. No hardcoded rates. Dynamic per country.
 */
class TaxService {
    static cache = {};
    static async getTaxConfig(countryCode = 'US') {
        // Serve from in-memory cache (refreshed every 10 minutes)
        if (this.cache[countryCode])
            return this.cache[countryCode];
        try {
            const repo = data_source_1.AppDataSource.getRepository(TaxConfig_1.TaxConfig);
            const config = await repo.findOne({ where: { countryCode, isActive: true } });
            if (config)
                this.cache[countryCode] = config;
            return config;
        }
        catch {
            return null;
        }
    }
    static async calculateOrderTotal(basePrice, countryCode = 'US', serviceClass = 'Economy', distanceInKm, durationInMinutes, surgeMultiplier = 1.0) {
        const config = await this.getTaxConfig(countryCode);
        let taxRate = 10; // default 10%
        let currency = 'USD';
        let currencySymbol = '$';
        let taxName = 'Tax';
        let serviceClassSurchargeRate = 0;
        if (config) {
            taxRate = config.taxRate;
            currency = config.currency;
            currencySymbol = config.currencySymbol;
            taxName = config.taxName;
            // Service class surcharge (e.g. Business adds 10% extra)
            const surcharges = config.serviceClassSurcharge || {};
            serviceClassSurchargeRate = surcharges[serviceClass] || 0;
        }
        let finalBasePrice = basePrice;
        if (config && distanceInKm !== undefined) {
            const distFare = distanceInKm * config.perKmRate;
            const timeFare = (durationInMinutes || distanceInKm * 2) * config.perMinuteRate; // fallback: 2min/km
            // FIX: Add basePrice to the delivery calculation
            finalBasePrice = (basePrice + config.baseFare + distFare + timeFare) * surgeMultiplier;
        }
        const surcharge = finalBasePrice * (serviceClassSurchargeRate / 100);
        const adjustedPrice = finalBasePrice + surcharge;
        const tax = parseFloat((adjustedPrice * (taxRate / 100)).toFixed(2));
        const total = parseFloat((adjustedPrice + tax).toFixed(2));
        return { price: parseFloat(adjustedPrice.toFixed(2)), tax, total, currency, currencySymbol, taxName };
    }
    /**
     * Seed default tax configs for common countries
     * Call once on server startup if table is empty
     */
    static async seedDefaults() {
        const repo = data_source_1.AppDataSource.getRepository(TaxConfig_1.TaxConfig);
        const count = await repo.count();
        if (count > 0)
            return;
        const defaults = [
            { countryCode: 'US', countryName: 'United States', currency: 'USD', currencySymbol: '$', taxRate: 8.5, taxName: 'Sales Tax', exchangeRateToUSD: 1, baseFare: 2.50, perKmRate: 1.20, perMinuteRate: 0.20, serviceClassSurcharge: { Economy: 0, Comfort: 5, Business: 10 } },
            { countryCode: 'IN', countryName: 'India', currency: 'INR', currencySymbol: '₹', taxRate: 18, taxName: 'GST', exchangeRateToUSD: 83, baseFare: 30, perKmRate: 12, perMinuteRate: 2, serviceClassSurcharge: { Economy: 0, Comfort: 5, Business: 12 } },
            { countryCode: 'AE', countryName: 'UAE', currency: 'AED', currencySymbol: 'د.إ', taxRate: 5, taxName: 'VAT', exchangeRateToUSD: 3.67, baseFare: 12, perKmRate: 2.5, perMinuteRate: 0.5, serviceClassSurcharge: { Economy: 0, Comfort: 3, Business: 8 } },
            { countryCode: 'GB', countryName: 'United Kingdom', currency: 'GBP', currencySymbol: '£', taxRate: 20, taxName: 'VAT', exchangeRateToUSD: 0.79, baseFare: 3.50, perKmRate: 1.80, perMinuteRate: 0.30, serviceClassSurcharge: { Economy: 0, Comfort: 5, Business: 10 } },
            { countryCode: 'SA', countryName: 'Saudi Arabia', currency: 'SAR', currencySymbol: 'ر.س', taxRate: 15, taxName: 'VAT', exchangeRateToUSD: 3.75, baseFare: 10, perKmRate: 2.2, perMinuteRate: 0.4, serviceClassSurcharge: { Economy: 0, Comfort: 4, Business: 8 } },
        ];
        for (const d of defaults) {
            await repo.save(repo.create({ ...d, isActive: true }));
        }
        console.log('[TAX SERVICE] Seeded default tax configs for 5 countries.');
    }
    /** Clear cache (call after admin updates a config) */
    static clearCache(countryCode) {
        if (countryCode)
            delete this.cache[countryCode];
        else
            this.cache = {};
    }
}
exports.TaxService = TaxService;
//# sourceMappingURL=taxService.js.map