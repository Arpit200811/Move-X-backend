import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * TaxConfig — Multi-Currency / Multi-Jurisdiction Tax Engine
 * Dynamically reads tax rates per country/region from the DB
 * rather than hardcoded static math.
 */
@Entity('tax_configs')
export class TaxConfig {
    @PrimaryGeneratedColumn('uuid')
    _id: string;

    @Column({ unique: true })
    countryCode: string; // 'IN', 'US', 'AE', 'GB' etc.

    @Column()
    countryName: string;

    @Column()
    currency: string; // 'INR', 'USD', 'AED', 'GBP'

    @Column()
    currencySymbol: string; // '₹', '$', 'د.إ', '£'

    @Column({ type: 'float', default: 30 }) // Updated default for India (Zomato/Swiggy style)
    baseFare: number; // Base fee for first 2-3km (e.g. 30 INR)

    @Column({ type: 'float', default: 12 }) // Updated default for India (Zomato/Swiggy style)
    perKmRate: number; // Rate per KM (e.g. 12 INR/km)

    @Column({ type: 'float', default: 2 }) // Updated default for India (Zomato/Swiggy style)
    perMinuteRate: number; // Rate per minute of travel (e.g. 2 INR/min)

    @Column({ type: 'float', default: 0 })
    taxRate: number; // e.g. 18.0 for 18% GST

    @Column({ default: 'GST' })
    taxName: string; // 'GST', 'VAT', 'Sales Tax'

    @Column({ type: 'float', default: 1.0 })
    exchangeRateToUSD: number; // 1 USD = X of this currency

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'simple-json', nullable: true })
    serviceClassSurcharge: any; // { Economy: 0, Comfort: 5, Business: 10 } % surcharge

    @CreateDateColumn()
    updatedAt: Date;
}
