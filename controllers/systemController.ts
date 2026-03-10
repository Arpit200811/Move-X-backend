import { Response } from 'express';
import { AuthenticatedRequest } from '../config/authMiddleware';

const systemState = {
    maintenanceMode: false,
    nodes: [
        { id: 'Node-ALPHA', status: 'Active', load: 45, region: 'US-East' },
        { id: 'Node-BRAVO', status: 'Active', load: 32, region: 'EU-West' },
        { id: 'Node-CHARLIE', status: 'Standby', load: 0, region: 'Asia-South' }
    ]
};

export const getSystemStatus = async (req: AuthenticatedRequest, res: Response) => {
    res.json({
        success: true,
        ...systemState,
        loadBalancer: {
            strategy: 'Least Connections',
            activeConnections: Math.floor(Math.random() * 500) + 100,
            throughput: '1.2 GB/s'
        }
    });
};

export const toggleMaintenance = async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Unauthorized' });
    
    systemState.maintenanceMode = !systemState.maintenanceMode;
    
    req.io.emit('maintenance_status', { enabled: systemState.maintenanceMode });
    
    res.json({ success: true, maintenanceMode: systemState.maintenanceMode });
};

export const getMaintenanceMode = () => systemState.maintenanceMode;

export const getSystemStats = async (req: AuthenticatedRequest, res: Response) => {
    res.json({
        success: true,
        stats: {
            uptime: Math.floor(process.uptime()),
            totalRequests: Math.floor(Math.random() * 100000),
            errorRate: (Math.random() * 0.05).toFixed(4),
            cpuUsage: (Math.random() * 100).toFixed(2),
            memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB'
        }
    });
};

export const getSystemLogs = async (req: AuthenticatedRequest, res: Response) => {
    const logs = [
        { timestamp: new Date().toISOString(), level: 'INFO', message: 'Core Dispatcher Heartbeat Pulse: Active' },
        { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'DEBUG', message: 'H3 Grid Recalculation: Completed' },
        { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'INFO', message: 'New Driver Induction Vector: Active' },
        { timestamp: new Date(Date.now() - 25000).toISOString(), level: 'WARN', message: 'Latency Anomaly in Node-BRAVO' },
        { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'INFO', message: 'Ledger Audit: Consensus Reached' }
    ];
    res.json({ success: true, logs });
};

export const getSupportTickets = async (req: AuthenticatedRequest, res: Response) => {
    // Mocking support tickets for now
    const tickets = [
        { id: 'TIC-1024', user: 'Amit Sharma', subject: 'Refund for missing item', status: 'OPEN', priority: 'HIGH', date: new Date().toISOString() },
        { id: 'TIC-1025', user: 'Rahul V.', subject: 'Driver took wrong route', status: 'CLOSED', priority: 'LOW', date: new Date(Date.now() - 3600000).toISOString() },
        { id: 'TIC-1026', user: 'Nisha K.', subject: 'App crashing on checkout', status: 'IN_PROGRESS', priority: 'MEDIUM', date: new Date(Date.now() - 7200000).toISOString() },
        { id: 'TIC-1027', user: 'Priya R.', subject: 'Coupon not applying', status: 'OPEN', priority: 'MEDIUM', date: new Date(Date.now() - 86400000).toISOString() }
    ];
    res.json({ success: true, tickets });
};

export const updateSystemConfig = async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    const { maintenanceMode, commissionRate, serviceRadius } = req.body;
    
    if (maintenanceMode !== undefined) {
        systemState.maintenanceMode = maintenanceMode;
        req.io.emit('maintenance_status', { enabled: systemState.maintenanceMode });
    }
    
    // In real app, these would be saved to DB or systemState
    res.json({ success: true, message: 'System configuration updated successfully' });
};
