import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import AddEmployeePage from './pages/AddEmployeePage';
import EditEmployeePage from './pages/EditEmployeePage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import EmployeeListPage from './pages/EmployeeListPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Only for visitors who are not logged in */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Only for logged-in users: everyone else is sent to /login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/add" element={<AddEmployeePage />} />
          <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
          <Route path="/employees/:id/edit" element={<EditEmployeePage />} />
        </Route>

        <Route path="/" element={<Navigate to="/employees" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
