import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import CreateTaskPage from './pages/CreateTaskPage';
import SubjectsPage from './pages/SubjectsPage';
import TaskDetailPage from './pages/TaskDetailPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/tasks/new" element={<CreateTaskPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
