import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuthStore } from '../store/authStore';
import { useBoardStore } from '../store/boardStore';
import { connectSocket, joinBoard, leaveBoard } from '../services/socket';
import Header from '../components/Header';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import ActivityPanel from '../components/ActivityPanel';
import SearchBar from '../components/SearchBar';
import { Plus, X, History, UserPlus, Trash2 } from 'lucide-react';

export default function BoardDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const boardId = parseInt(id);
    const token = useAuthStore((s) => s.token);
    const {
        currentBoard,
        loading,
        fetchBoard,
        createList,
        deleteList,
        createTask,
        moveTask,
        optimisticMoveTask,
        addMember,
        deleteBoard,
    } = useBoardStore();

    const [showAddList, setShowAddList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [addingTaskInList, setAddingTaskInList] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);
    const [showActivity, setShowActivity] = useState(false);
    const [memberEmail, setMemberEmail] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => {
        fetchBoard(boardId);
        const socket = connectSocket(token);
        joinBoard(boardId);
        return () => leaveBoard(boardId);
    }, [boardId, token, fetchBoard]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleAddList = async (e) => {
        e.preventDefault();
        if (!newListTitle.trim()) return;
        try {
            await createList(boardId, newListTitle.trim());
            setNewListTitle('');
            setShowAddList(false);
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleAddTask = async (listId) => {
        if (!newTaskTitle.trim()) return;
        try {
            await createTask(listId, { title: newTaskTitle.trim() });
            setNewTaskTitle('');
            setAddingTaskInList(null);
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleDeleteList = async (listId) => {
        if (!confirm('Delete this list and all its tasks?')) return;
        try {
            await deleteList(listId);
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!memberEmail.trim()) return;
        try {
            const member = await addMember(boardId, memberEmail.trim());
            showToast(`Added ${member.name} to the board`);
            setMemberEmail('');
            setShowAddMember(false);
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleDeleteBoard = async () => {
        if (!confirm('Delete this board? This cannot be undone.')) return;
        try {
            await deleteBoard(boardId);
            navigate('/boards');
        } catch (err) {
            showToast(err.message);
        }
    };

    const onDragEnd = useCallback(
        async (result) => {
            const { source, destination, draggableId } = result;
            if (!destination) return;
            if (source.droppableId === destination.droppableId && source.index === destination.index) return;

            const taskId = parseInt(draggableId.replace('task-', ''));
            const srcListId = parseInt(source.droppableId.replace('list-', ''));
            const destListId = parseInt(destination.droppableId.replace('list-', ''));

            // Optimistic update
            optimisticMoveTask(srcListId, destListId, source.index, destination.index, taskId);

            // Persist
            try {
                await moveTask(taskId, destListId, destination.index);
            } catch (err) {
                // Revert by refetching
                fetchBoard(boardId);
                showToast('Failed to move task');
            }
        },
        [optimisticMoveTask, moveTask, fetchBoard, boardId]
    );

    if (loading || !currentBoard) {
        return (
            <div className="board-detail">
                <Header />
                <div className="loader" />
            </div>
        );
    }

    return (
        <div className="board-detail">
            <Header />

            <div className="board-toolbar">
                <h2>{currentBoard.title}</h2>
                <span className="board-desc">{currentBoard.description}</span>
                <div style={{ flex: 1 }} />

                <SearchBar boardId={boardId} onSelectTask={(task) => setSelectedTask(task)} />

                <div className="members-section">
                    {currentBoard.members?.slice(0, 5).map((m) => (
                        <div key={m.user.id} className="member-chip">
                            <div className="avatar-mini">{m.user.name.charAt(0)}</div>
                            {m.user.name.split(' ')[0]}
                        </div>
                    ))}
                    <button className="btn-icon" title="Add member" onClick={() => setShowAddMember(true)}>
                        <UserPlus size={16} />
                    </button>
                </div>

                <button className="btn-icon" title="Activity history" onClick={() => setShowActivity(true)}>
                    <History size={16} />
                </button>

                <button className="btn-icon" title="Delete board" onClick={handleDeleteBoard} style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
                    <Trash2 size={16} style={{ color: 'var(--danger)' }} />
                </button>
            </div>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="kanban-board">
                    {currentBoard.lists.map((list) => (
                        <div className="kanban-list" key={list.id}>
                            <div className="kanban-list-header">
                                <h3>{list.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="count">{list.tasks.length}</span>
                                    <button
                                        className="btn-icon"
                                        style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }}
                                        onClick={() => handleDeleteList(list.id)}
                                        title="Delete list"
                                    >
                                        <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </div>
                            </div>

                            <Droppable droppableId={`list-${list.id}`}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`kanban-list-body ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                                    >
                                        {list.tasks.map((task, index) => (
                                            <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <TaskCard
                                                            task={task}
                                                            isDragging={snapshot.isDragging}
                                                            onClick={() => setSelectedTask(task)}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>

                            <div className="kanban-list-footer">
                                {addingTaskInList === list.id ? (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleAddTask(list.id);
                                        }}
                                    >
                                        <input
                                            type="text"
                                            placeholder="Task title..."
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            autoFocus
                                            onBlur={() => {
                                                if (!newTaskTitle.trim()) {
                                                    setAddingTaskInList(null);
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                background: 'var(--bg-input)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)',
                                                color: 'var(--text-primary)',
                                                fontFamily: 'var(--font)',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                                marginBottom: '8px',
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1, width: 'auto' }}>
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                    setAddingTaskInList(null);
                                                    setNewTaskTitle('');
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        className="add-task-btn"
                                        onClick={() => {
                                            setAddingTaskInList(list.id);
                                            setNewTaskTitle('');
                                        }}
                                    >
                                        <Plus size={16} /> Add task
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add list */}
                    {showAddList ? (
                        <form className="add-list-form" onSubmit={handleAddList}>
                            <input
                                type="text"
                                placeholder="List title..."
                                value={newListTitle}
                                onChange={(e) => setNewListTitle(e.target.value)}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1, width: 'auto' }}>
                                    Add List
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setShowAddList(false);
                                        setNewListTitle('');
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="add-list-card" onClick={() => setShowAddList(true)}>
                            <Plus size={18} /> Add list
                        </div>
                    )}
                </div>
            </DragDropContext>

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    boardId={boardId}
                    members={currentBoard.members}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => fetchBoard(boardId)}
                />
            )}

            {/* Activity Panel */}
            {showActivity && (
                <ActivityPanel boardId={boardId} onClose={() => setShowActivity(false)} />
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Add Member</h2>
                        <form onSubmit={handleAddMember}>
                            <div className="form-group">
                                <label>User Email</label>
                                <input
                                    type="email"
                                    placeholder="bob@example.com"
                                    value={memberEmail}
                                    onChange={(e) => setMemberEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMember(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
