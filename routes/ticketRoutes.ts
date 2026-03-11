import { Router } from "express";
import { getTicketsData, searchBuses } from "../controllers/ticketController";
import { auth } from "../config/authMiddleware";

const router = Router();

// GET /api/tickets/home - Get all display data for tickets screen
router.get("/home", auth as any, getTicketsData);

// GET /api/tickets/search/buses - Search buses dynamically
router.get("/search/buses", auth as any, searchBuses);

export default router;
