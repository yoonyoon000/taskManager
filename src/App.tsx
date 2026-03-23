import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { TaskProvider } from './contexts/TaskContext';
import { useAuth } from './contexts/AuthContext';
import CalendarPage from './pages/CalendarPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app-loading">로그인 상태를 확인하는 중입니다.</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <TaskProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </TaskProvider>
  );
}

export default App;
