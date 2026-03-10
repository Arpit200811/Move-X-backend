import express from 'express';
import { 
    createGroupOrder, 
    joinGroupOrder, 
    addItemToGroupCart 
} from '../controllers/groupOrderController';
import { auth } from '../config/authMiddleware';

const router = express.Router();

router.post('/create', auth as any, createGroupOrder);
router.post('/join', auth as any, joinGroupOrder);
router.post('/:groupId/items', auth as any, addItemToGroupCart); // Add item for specific user

export default router;
