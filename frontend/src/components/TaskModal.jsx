import { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { X, Trash2, Save } from 'lucide-react';

export default function TaskModal({ task, boardId, members, onClose, onUpdate }) {
    const { updateTask, deleteTask } = useBoardStore();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState(task.priority);
    const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        setError('');
        try {
            await updateTask(task.id, {
                title: title.trim(),
                description,
                priority,
                assigneeId: assigneeId ? parseInt(assigneeId) : null,
            });
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this task?')) return;
        try {
            await deleteTask(task.id, task.listId);
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal task-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>Edit Task</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="form-group">
                    <label>Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description..."
                    />
                </div>

                <div className="task-detail-grid">
                    <div className="task-detail-item">
                        <label>Priority</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div className="task-detail-item">
                        <label>Assignee</label>
                        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                            <option value="">Unassigned</option>
                            {members?.map((m) => (
                                <option key={m.user.id} value={m.user.id}>
                                    {m.user.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                        <Trash2 size={14} /> Delete
                    </button>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        style={{ width: 'auto' }}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
