import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// GET /api/boards - List user's boards
router.get('/', async (req, res) => {
    try {
        const boards = await prisma.board.findMany({
            where: {
                members: { some: { userId: req.userId } },
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                _count: { select: { lists: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json({ boards });
    } catch (error) {
        console.error('List boards error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/boards - Create board
router.post('/', async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const board = await prisma.board.create({
            data: {
                title,
                description: description || '',
                ownerId: req.userId,
                members: {
                    create: { userId: req.userId, role: 'owner' },
                },
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: 'created',
                entityType: 'board',
                entityId: board.id,
                details: `Created board "${board.title}"`,
                userId: req.userId,
                boardId: board.id,
            },
        });

        res.status(201).json({ board });
    } catch (error) {
        console.error('Create board error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/boards/:id - Get board with lists, tasks, members
router.get('/:id', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                lists: {
                    orderBy: { position: 'asc' },
                    include: {
                        tasks: {
                            orderBy: { position: 'asc' },
                            include: {
                                assignee: { select: { id: true, name: true, email: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        res.json({ board });
    } catch (error) {
        console.error('Get board error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/boards/:id - Update board
router.put('/:id', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const { title, description } = req.body;

        const board = await prisma.board.findUnique({ where: { id: boardId } });
        if (!board || board.ownerId !== req.userId) {
            return res.status(403).json({ error: 'Only the owner can update the board' });
        }

        const updated = await prisma.board.update({
            where: { id: boardId },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
            },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
            },
        });

        res.json({ board: updated });
    } catch (error) {
        console.error('Update board error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/boards/:id - Delete board
router.delete('/:id', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);

        const board = await prisma.board.findUnique({ where: { id: boardId } });
        if (!board || board.ownerId !== req.userId) {
            return res.status(403).json({ error: 'Only the owner can delete the board' });
        }

        await prisma.board.delete({ where: { id: boardId } });
        res.json({ message: 'Board deleted' });
    } catch (error) {
        console.error('Delete board error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/boards/:id/members - Add member
router.post('/:id/members', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const userToAdd = await prisma.user.findUnique({ where: { email } });
        if (!userToAdd) {
            return res.status(404).json({ error: 'User not found' });
        }

        const existingMember = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: userToAdd.id } },
        });
        if (existingMember) {
            return res.status(409).json({ error: 'User is already a member' });
        }

        await prisma.boardMember.create({
            data: { boardId, userId: userToAdd.id, role: 'member' },
        });

        const member = {
            id: userToAdd.id,
            name: userToAdd.name,
            email: userToAdd.email,
        };

        // Log activity
        await prisma.activity.create({
            data: {
                action: 'added_member',
                entityType: 'board',
                entityId: boardId,
                details: `Added ${userToAdd.name} to the board`,
                userId: req.userId,
                boardId,
            },
        });

        // Emit real-time event
        const io = req.app.get('io');
        io.to(`board:${boardId}`).emit('member:added', { member, boardId });

        res.status(201).json({ member });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/boards/:id/tasks - Search & paginate tasks
router.get('/:id/tasks', async (req, res) => {
    try {
        const boardId = parseInt(req.params.id);
        const { search = '', page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const membership = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const where = {
            list: { boardId },
            ...(search && {
                OR: [
                    { title: { contains: search } },
                    { description: { contains: search } },
                ],
            }),
        };

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    assignee: { select: { id: true, name: true, email: true } },
                    list: { select: { id: true, title: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.task.count({ where }),
        ]);

        res.json({
            tasks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Search tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
