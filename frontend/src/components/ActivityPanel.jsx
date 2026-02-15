import { useEffect, useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { X } from 'lucide-react';

export default function ActivityPanel({ boardId, onClose }) {
    const { activities, fetchActivities } = useBoardStore();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities(boardId)
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
    }, [boardId, fetchActivities]);

    const timeAgo = (dateStr) => {
        const now = new Date();
        const date = new Date(dateStr);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'created': return '✨';
            case 'updated': return '✏️';
            case 'moved': return '↗️';
            case 'deleted': return '🗑️';
            case 'assigned': return '👤';
            case 'added_member': return '👥';
            default: return '📋';
        }
    };

    return (
        <div className="activity-panel">
            <div className="activity-panel-header">
                <h3>Activity</h3>
                <button className="btn-icon" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <div className="activity-list">
                {loading ? (
                    <div className="loader" />
                ) : activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No activity yet
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="activity-item">
                            <div className="activity-dot" />
                            <div className="activity-content">
                                <span className="user-name">
                                    {getActionIcon(activity.action)} {activity.user.name}
                                </span>
                                <div className="details">{activity.details}</div>
                                <div className="time">{timeAgo(activity.createdAt)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
