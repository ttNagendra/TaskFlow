import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut } from 'lucide-react';
import { disconnectSocket } from '../services/socket';

export default function Header() {
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        disconnectSocket();
        logout();
    };

    return (
        <header className="header">
            <Link to="/boards" className="header-brand">
                <div className="logo">T</div>
                <span>TaskFlow</span>
            </Link>

            <div className="header-actions">
                {user && (
                    <div className="header-user">
                        <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
                        <span>{user.name}</span>
                    </div>
                )}
                <button className="btn-icon" onClick={handleLogout} title="Sign out">
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
