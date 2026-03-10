import { Router } from "express";
import { getTicketsData } from "../controllers/ticketController";
import { auth } from "../config/authMiddleware";

const router = Router();

// GET /api/tickets/home - Get all display data for tickets screen
router.get("/home", auth as any, getTicketsData);

export default router;
