"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoFencingService = void 0;
const data_source_1 = require("../data-source");
const Zone_1 = require("../models/Zone");
class GeoFencingService {
    /**
     * Checks if a point is within any active service zone.
     * Returns the zone if found, otherwise null.
     */
    static async getZoneAtLocation(lat, lng) {
        try {
            const zoneRepository = data_source_1.AppDataSource.getRepository(Zone_1.Zone);
            const activeZones = await zoneRepository.find({ where: { isActive: true } });
            for (const zone of activeZones) {
                if (this.isPointInPolygon([lng, lat], zone.boundary.coordinates[0])) {
                    return zone;
                }
            }
            return null;
        }
        catch (error) {
            console.error('[GEO-FENCING ERROR]:', error);
            return null;
        }
    }
    /**
     * Ray-casting algorithm to check if a point is inside a polygon.
     */
    static isPointInPolygon(point, polygon) {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
    /**
     * Validates if the operation is possible between two points (pickup and destination).
     */
    static async validateServiceArea(pickup, destination) {
        const pickupZone = await this.getZoneAtLocation(pickup.lat, pickup.lng);
        if (!pickupZone)
            throw new Error('SERVICE_NOT_AVAILABLE_IN_PICKUP_AREA');
        const destZone = await this.getZoneAtLocation(destination.lat, destination.lng);
        if (!destZone)
            throw new Error('SERVICE_NOT_AVAILABLE_IN_DESTINATION_AREA');
        return { pickupZone, destZone };
    }
}
exports.GeoFencingService = GeoFencingService;
//# sourceMappingURL=geoFencingService.js.map