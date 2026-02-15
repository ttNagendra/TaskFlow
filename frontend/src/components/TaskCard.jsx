export default function TaskCard({ task, isDragging, onClick }) {
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div
            className={`task-card ${isDragging ? 'dragging' : ''}`}
            onClick={onClick}
        >
            <div className="task-card-title">{task.title}</div>
            <div className="task-card-meta">
                <span className={`task-priority ${task.priority}`}>
                    {task.priority}
                </span>
                {task.assignee && (
                    <div className="task-assignee" title={task.assignee.name}>
                        {getInitials(task.assignee.name)}
                    </div>
                )}
            </div>
        </div>
    );
}
