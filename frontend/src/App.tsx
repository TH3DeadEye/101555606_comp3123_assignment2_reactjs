import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';

// Each screen is loaded when it is first needed, so someone who only opens the
// login page does not download the employee screens (AppLayout shows a
// loading message while a screen arrives).
const AddEmployeePage = lazy(() => import('./pages/AddEmployeePage'));
const EditEmployeePage = lazy(() => import('./pages/EditEmployeePage'));
const EmployeeDetailsPage = lazy(() => import('./pages/EmployeeDetailsPage'));
const EmployeeListPage = lazy(() => import('./pages/EmployeeListPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

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
