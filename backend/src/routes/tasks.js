import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// POST /api/tasks/:listId - Create task
router.post('/:listId', async (req, res) => {
    try {
        const listId = parseInt(req.params.listId);
        const { title, description, priority, dueDate, assigneeId } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

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

        // Get max position in this list
        const maxPos = await prisma.task.aggregate({
            where: { listId },
            _max: { position: true },
        });
        const position = (maxPos._max.position ?? -1) + 1;

        const task = await prisma.task.create({
            data: {
                title,
                description: description || '',
                priority: priority || 'medium',
                position,
                listId,
                assigneeId: assigneeId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
            },
            include: {
                assignee: { select: { id: true, name: true, email: true } },
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: 'created',
                entityType: 'task',
                entityId: task.id,
                details: `Created task "${task.title}"`,
                userId: req.userId,
                boardId: list.boardId,
            },
        });

        // Emit real-time event
        const io = req.app.get('io');
        io.to(`board:${list.boardId}`).emit('task:created', { task, boardId: list.boardId });

        res.status(201).json({ task });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/tasks/:id - Update task (includes move/reorder)
router.put('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const { title, description, priority, dueDate, assigneeId, listId, position } = req.body;

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { list: true },
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const boardId = task.list.boardId;
        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const isMoving = listId !== undefined && listId !== task.listId;
        const isReordering = position !== undefined;

        // Build update data
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
        if (listId !== undefined) updateData.listId = listId;
        if (position !== undefined) updateData.position = position;

        const updated = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignee: { select: { id: true, name: true, email: true } },
            },
        });

        // Log activity
        let action = 'updated';
        let details = `Updated task "${updated.title}"`;

        if (isMoving) {
            const newList = await prisma.list.findUnique({ where: { id: listId } });
            const oldList = await prisma.list.findUnique({ where: { id: task.listId } });
            action = 'moved';
            details = `Moved task "${updated.title}" from "${oldList.title}" to "${newList.title}"`;
        }

        if (assigneeId !== undefined && assigneeId !== task.assigneeId) {
            if (assigneeId) {
                const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
                details = `Assigned "${updated.title}" to ${assignee.name}`;
            } else {
                details = `Unassigned "${updated.title}"`;
            }
            action = 'assigned';
        }

        await prisma.activity.create({
            data: {
                action,
                entityType: 'task',
                entityId: task.id,
                details,
                userId: req.userId,
                boardId,
            },
        });

        // Emit real-time event
        const io = req.app.get('io');
        const eventName = isMoving ? 'task:moved' : 'task:updated';
        io.to(`board:${boardId}`).emit(eventName, {
            task: updated,
            boardId,
            previousListId: isMoving ? task.listId : undefined,
        });

        res.json({ task: updated });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { list: true },
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const boardId = task.list.boardId;
        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await prisma.task.delete({ where: { id: taskId } });

        // Log activity
        await prisma.activity.create({
            data: {
                action: 'deleted',
                entityType: 'task',
                entityId: taskId,
                details: `Deleted task "${task.title}"`,
                userId: req.userId,
                boardId,
            },
        });

        const io = req.app.get('io');
        io.to(`board:${boardId}`).emit('task:deleted', { taskId, listId: task.listId, boardId });

        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
