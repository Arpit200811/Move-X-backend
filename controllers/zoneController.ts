import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Zone } from '../models/Zone';
import { TaxConfig } from '../models/TaxConfig';
import { GeoFencingService } from '../services/geoFencingService';

export const getZones = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Zone);
        const zones = await repo.find();
        res.status(200).json({ success: true, zones });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createZone = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Zone);
        const zone = repo.create(req.body);
        await repo.save(zone);
        res.status(201).json({ success: true, zone });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteZone = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(Zone);
        await repo.delete(req.params.id);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTaxConfigs = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(TaxConfig);
        const configs = await repo.find();
        res.status(200).json({ success: true, configs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateTaxConfig = async (req: Request, res: Response) => {
    try {
        const repo = AppDataSource.getRepository(TaxConfig);
        const { countryCode, taxRate } = req.body;
        let config = await repo.findOne({ where: { countryCode } });
        if (config) {
            repo.merge(config, req.body);
        } else {
            config = repo.create(req.body) as any;
        }
        if (config) {
            await repo.save(config);
        }
        res.status(200).json({ success: true, config });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const checkServiceability = async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;
        console.log(`🔍 [SERVICE CHECK] Lat: ${lat}, Lng: ${lng}`);
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
        }

        const zone = await GeoFencingService.getZoneAtLocation(Number(lat), Number(lng));
        
        if (!zone) {
            return res.status(200).json({ 
                success: false, 
                message: 'Neural link established: We do not serve this sector yet.',
                isServiceable: false 
            });
        }

        return res.status(200).json({ 
            success: true, 
            isServiceable: true,
            zone: {
                name: zone.name,
                id: zone._id
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
