import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/activity/:boardId - Get board activity history
router.get('/:boardId', async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        const { page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where: { boardId },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.activity.count({ where: { boardId } }),
        ]);

        res.json({
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
