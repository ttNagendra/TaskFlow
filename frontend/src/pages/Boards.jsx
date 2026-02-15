import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBoardStore } from '../store/boardStore';
import { Plus, LogOut, LayoutDashboard } from 'lucide-react';
import Header from '../components/Header';

export default function Boards() {
    const navigate = useNavigate();
    const { boards, loading, fetchBoards, createBoard } = useBoardStore();
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        fetchBoards();
    }, [fetchBoards]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError('');
        try {
            const board = await createBoard(title, description);
            setShowCreate(false);
            setTitle('');
            setDescription('');
            navigate(`/boards/${board.id}`);
        } catch (err) {
            setCreateError(err.message);
        }
    };

    return (
        <div className="boards-page">
            <Header />

            <div className="boards-container">
                <div className="boards-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutDashboard size={24} style={{ color: 'var(--accent-primary)' }} />
                        My Boards
                    </h2>
                    <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowCreate(true)}>
                        <Plus size={18} />
                        New Board
                    </button>
                </div>

                {loading ? (
                    <div className="loader" />
                ) : (
                    <div className="boards-grid">
                        {boards.map((board) => (
                            <div
                                key={board.id}
                                className="board-card"
                                onClick={() => navigate(`/boards/${board.id}`)}
                            >
                                <h3>{board.title}</h3>
                                <div className="description">
                                    {board.description || 'No description'}
                                </div>
                                <div className="meta">
                                    <span>{board._count?.lists || 0} lists</span>
                                    <div className="members-avatars">
                                        {board.members?.slice(0, 4).map((m) => (
                                            <div key={m.user.id} className="member-avatar" title={m.user.name}>
                                                {m.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {(board.members?.length || 0) > 4 && (
                                            <div className="member-avatar">+{board.members.length - 4}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {boards.length === 0 && !loading && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                                <LayoutDashboard size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <h3 style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>No boards yet</h3>
                                <p style={{ fontSize: '0.9rem' }}>Create your first board to get started</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Board Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Board</h2>
                        {createError && <div className="auth-error">{createError}</div>}
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Board Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Product Launch"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Description (optional)</label>
                                <input
                                    type="text"
                                    placeholder="What's this board for?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                                    Create Board
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
