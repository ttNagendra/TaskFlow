import { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { Search } from 'lucide-react';

export default function SearchBar({ boardId, onSelectTask }) {
    const { searchTasks, searchResults, clearSearch } = useBoardStore();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const ref = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (value) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!value.trim()) {
            clearSearch();
            setShowResults(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            searchTasks(boardId, value).then(() => setShowResults(true));
        }, 300);
    };

    const handleSelect = (task) => {
        onSelectTask(task);
        setShowResults(false);
        setQuery('');
        clearSearch();
    };

    return (
        <div className="search-container" ref={ref}>
            <Search size={16} className="search-icon" />
            <input
                type="text"
                className="search-input"
                placeholder="Search tasks..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                    if (searchResults?.tasks?.length) setShowResults(true);
                }}
            />

            {showResults && searchResults?.tasks && (
                <div className="search-results">
                    {searchResults.tasks.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No tasks found
                        </div>
                    ) : (
                        searchResults.tasks.map((task) => (
                            <div key={task.id} className="search-result-item" onClick={() => handleSelect(task)}>
                                <div className="title">
                                    <span className={`task-priority ${task.priority}`} style={{ marginRight: '8px' }}>
                                        {task.priority}
                                    </span>
                                    {task.title}
                                </div>
                                <div className="list-name">in {task.list?.title}</div>
                            </div>
                        ))
                    )}
                    {searchResults.pagination?.totalPages > 1 && (
                        <div style={{ padding: '8px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                            Showing {searchResults.tasks.length} of {searchResults.pagination.total} results
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
