import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// POST /api/lists/:boardId - Create list
router.post('/:boardId', async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get max position
        const maxPos = await prisma.list.aggregate({
            where: { boardId },
            _max: { position: true },
        });
        const position = (maxPos._max.position ?? -1) + 1;

        const list = await prisma.list.create({
            data: { title, position, boardId },
            include: { tasks: true },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: 'created',
                entityType: 'list',
                entityId: list.id,
                details: `Created list "${list.title}"`,
                userId: req.userId,
                boardId,
            },
        });

        // Emit real-time event
        const io = req.app.get('io');
        io.to(`board:${boardId}`).emit('list:created', { list, boardId });

        res.status(201).json({ list });
    } catch (error) {
        console.error('Create list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/lists/:id - Update list
router.put('/:id', async (req, res) => {
    try {
        const listId = parseInt(req.params.id);
        const { title, position } = req.body;

        const list = await prisma.list.findUnique({ where: { id: listId } });
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId: list.boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updated = await prisma.list.update({
            where: { id: listId },
            data: {
                ...(title && { title }),
                ...(position !== undefined && { position }),
            },
            include: { tasks: true },
        });

        const io = req.app.get('io');
        io.to(`board:${list.boardId}`).emit('list:updated', { list: updated, boardId: list.boardId });

        res.json({ list: updated });
    } catch (error) {
        console.error('Update list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/lists/:id - Delete list
router.delete('/:id', async (req, res) => {
    try {
        const listId = parseInt(req.params.id);

        const list = await prisma.list.findUnique({ where: { id: listId } });
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId: list.boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await prisma.list.delete({ where: { id: listId } });

        // Log activity
        await prisma.activity.create({
            data: {
                action: 'deleted',
                entityType: 'list',
                entityId: listId,
                details: `Deleted list "${list.title}"`,
                userId: req.userId,
                boardId: list.boardId,
            },
        });

        const io = req.app.get('io');
        io.to(`board:${list.boardId}`).emit('list:deleted', { listId, boardId: list.boardId });

        res.json({ message: 'List deleted' });
    } catch (error) {
        console.error('Delete list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
