import { create } from 'zustand';
import api from '../services/api';

export const useBoardStore = create((set, get) => ({
    boards: [],
    currentBoard: null,
    activities: [],
    searchResults: null,
    loading: false,

    // Fetch all boards
    fetchBoards: async () => {
        set({ loading: true });
        try {
            const { data } = await api.get('/api/boards');
            set({ boards: data.boards, loading: false });
        } catch (err) {
            set({ loading: false });
            throw err;
        }
    },

    // Create a board
    createBoard: async (title, description) => {
        const { data } = await api.post('/api/boards', { title, description });
        set((s) => ({ boards: [data.board, ...s.boards] }));
        return data.board;
    },

    // Fetch a single board with all lists/tasks
    fetchBoard: async (boardId) => {
        set({ loading: true });
        try {
            const { data } = await api.get(`/api/boards/${boardId}`);
            set({ currentBoard: data.board, loading: false });
        } catch (err) {
            set({ loading: false });
            throw err;
        }
    },

    // Delete a board
    deleteBoard: async (boardId) => {
        await api.delete(`/api/boards/${boardId}`);
        set((s) => ({ boards: s.boards.filter((b) => b.id !== boardId) }));
    },

    // Create a list
    createList: async (boardId, title) => {
        const { data } = await api.post(`/api/lists/${boardId}`, { title });
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: [...s.currentBoard.lists, data.list],
                },
            };
        });
        return data.list;
    },

    // Delete a list
    deleteList: async (listId) => {
        await api.delete(`/api/lists/${listId}`);
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.filter((l) => l.id !== listId),
                },
            };
        });
    },

    // Create a task
    createTask: async (listId, taskData) => {
        const { data } = await api.post(`/api/tasks/${listId}`, taskData);
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) =>
                        l.id === listId ? { ...l, tasks: [...l.tasks, data.task] } : l
                    ),
                },
            };
        });
        return data.task;
    },

    // Update a task
    updateTask: async (taskId, updates) => {
        const { data } = await api.put(`/api/tasks/${taskId}`, updates);
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) => ({
                        ...l,
                        tasks: l.tasks.map((t) => (t.id === taskId ? data.task : t)),
                    })),
                },
            };
        });
        return data.task;
    },

    // Move task (drag-and-drop)
    moveTask: async (taskId, newListId, newPosition) => {
        const { data } = await api.put(`/api/tasks/${taskId}`, {
            listId: newListId,
            position: newPosition,
        });
        return data.task;
    },

    // Delete a task
    deleteTask: async (taskId, listId) => {
        await api.delete(`/api/tasks/${taskId}`);
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) =>
                        l.id === listId
                            ? { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) }
                            : l
                    ),
                },
            };
        });
    },

    // Add member
    addMember: async (boardId, email) => {
        const { data } = await api.post(`/api/boards/${boardId}/members`, { email });
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    members: [...s.currentBoard.members, { user: data.member, role: 'member' }],
                },
            };
        });
        return data.member;
    },

    // Fetch activities
    fetchActivities: async (boardId, page = 1) => {
        const { data } = await api.get(`/api/activity/${boardId}?page=${page}&limit=15`);
        set({ activities: data.activities });
        return data;
    },

    // Search tasks
    searchTasks: async (boardId, query, page = 1) => {
        const { data } = await api.get(
            `/api/boards/${boardId}/tasks?search=${encodeURIComponent(query)}&page=${page}&limit=10`
        );
        set({ searchResults: data });
        return data;
    },

    clearSearch: () => set({ searchResults: null }),

    // Real-time update helpers (called from socket events)
    handleTaskCreated: (task) => {
        set((s) => {
            if (!s.currentBoard) return s;
            const alreadyExists = s.currentBoard.lists.some((l) =>
                l.tasks.some((t) => t.id === task.id)
            );
            if (alreadyExists) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) =>
                        l.id === task.listId ? { ...l, tasks: [...l.tasks, task] } : l
                    ),
                },
            };
        });
    },

    handleTaskUpdated: (task) => {
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) => ({
                        ...l,
                        tasks: l.tasks.map((t) => (t.id === task.id ? task : t)),
                    })),
                },
            };
        });
    },

    handleTaskMoved: (task, previousListId) => {
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) => {
                        if (l.id === previousListId) {
                            return { ...l, tasks: l.tasks.filter((t) => t.id !== task.id) };
                        }
                        if (l.id === task.listId) {
                            const exists = l.tasks.some((t) => t.id === task.id);
                            if (exists) {
                                return { ...l, tasks: l.tasks.map((t) => (t.id === task.id ? task : t)) };
                            }
                            return { ...l, tasks: [...l.tasks, task] };
                        }
                        return l;
                    }),
                },
            };
        });
    },

    handleTaskDeleted: (taskId, listId) => {
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.map((l) =>
                        l.id === listId
                            ? { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) }
                            : l
                    ),
                },
            };
        });
    },

    handleListCreated: (list) => {
        set((s) => {
            if (!s.currentBoard) return s;
            const exists = s.currentBoard.lists.some((l) => l.id === list.id);
            if (exists) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: [...s.currentBoard.lists, { ...list, tasks: list.tasks || [] }],
                },
            };
        });
    },

    handleListDeleted: (listId) => {
        set((s) => {
            if (!s.currentBoard) return s;
            return {
                currentBoard: {
                    ...s.currentBoard,
                    lists: s.currentBoard.lists.filter((l) => l.id !== listId),
                },
            };
        });
    },

    // Update board state optimistically for drag-and-drop
    optimisticMoveTask: (sourceListId, destListId, sourceIndex, destIndex, taskId) => {
        set((s) => {
            if (!s.currentBoard) return s;
            const lists = [...s.currentBoard.lists.map((l) => ({ ...l, tasks: [...l.tasks] }))];
            const sourceList = lists.find((l) => l.id === sourceListId);
            const destList = lists.find((l) => l.id === destListId);
            if (!sourceList || !destList) return s;

            const [moved] = sourceList.tasks.splice(sourceIndex, 1);
            moved.listId = destListId;
            destList.tasks.splice(destIndex, 0, moved);

            return { currentBoard: { ...s.currentBoard, lists } };
        });
    },
}));
