import { io } from 'socket.io-client';
import { useBoardStore } from '../store/boardStore';

let socket = null;

export function connectSocket(token) {
    if (socket?.connected) return socket;

    socket = io('http://localhost:3001', {
        auth: { token },
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
    });

    // Real-time event handlers
    socket.on('task:created', ({ task }) => {
        useBoardStore.getState().handleTaskCreated(task);
    });

    socket.on('task:updated', ({ task }) => {
        useBoardStore.getState().handleTaskUpdated(task);
    });

    socket.on('task:moved', ({ task, previousListId }) => {
        useBoardStore.getState().handleTaskMoved(task, previousListId);
    });

    socket.on('task:deleted', ({ taskId, listId }) => {
        useBoardStore.getState().handleTaskDeleted(taskId, listId);
    });

    socket.on('list:created', ({ list }) => {
        useBoardStore.getState().handleListCreated(list);
    });

    socket.on('list:deleted', ({ listId }) => {
        useBoardStore.getState().handleListDeleted(listId);
    });

    return socket;
}

export function joinBoard(boardId) {
    if (socket?.connected) {
        socket.emit('board:join', boardId);
    }
}

export function leaveBoard(boardId) {
    if (socket?.connected) {
        socket.emit('board:leave', boardId);
    }
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getSocket() {
    return socket;
}
