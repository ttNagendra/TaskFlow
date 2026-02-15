import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Boards from './pages/Boards';
import BoardDetail from './pages/BoardDetail';

function PrivateRoute({ children }) {
    const token = useAuthStore((s) => s.token);
    return token ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const token = useAuthStore((s) => s.token);
    return !token ? children : <Navigate to="/boards" />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/boards" element={<PrivateRoute><Boards /></PrivateRoute>} />
            <Route path="/boards/:id" element={<PrivateRoute><BoardDetail /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/boards" />} />
        </Routes>
    );
}
