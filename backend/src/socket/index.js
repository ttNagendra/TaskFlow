import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret';

export function setupSocket(io) {
    // Authenticate socket connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User ${socket.userId} connected (socket: ${socket.id})`);

        // Join a board room
        socket.on('board:join', (boardId) => {
            socket.join(`board:${boardId}`);
            console.log(`   User ${socket.userId} joined board:${boardId}`);
        });

        // Leave a board room
        socket.on('board:leave', (boardId) => {
            socket.leave(`board:${boardId}`);
            console.log(`   User ${socket.userId} left board:${boardId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 User ${socket.userId} disconnected`);
        });
    });
}
