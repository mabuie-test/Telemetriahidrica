import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';

import AdminDashboard    from './components/AdminDashboard';
import UsersList         from './components/UsersList';
import MedidoresList     from './components/MedidoresList';
import ReadingsIngest    from './components/ReadingsIngest';
import ReadingsView      from './components/ReadingsView';
import FailuresAlerts    from './components/FailuresAlerts';
import ReportsGenerate   from './components/ReportsGenerate';
import AuditLogs         from './components/AuditLogs';
import AdminAccounting   from './components/AdminAccounting';

import ClienteDashboard  from './components/ClienteDashboard';
import ClientAccounting  from './components/ClientAccounting';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Rotas ADMIN */}
        <Route
          path="/admin"
          element={
            <PrivateRoute papel="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute papel="admin">
              <UsersList />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/medidores"
          element={
            <PrivateRoute papel="admin">
              <MedidoresList />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/ingest"
          element={
            <PrivateRoute papel="admin">
              <ReadingsIngest />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/view"
          element={
            <PrivateRoute papel="admin">
              <ReadingsView />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/fail-alerts"
          element={
            <PrivateRoute papel="admin">
              <FailuresAlerts />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PrivateRoute papel="admin">
              <ReportsGenerate />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/contabilidade"
          element={
            <PrivateRoute papel="admin">
              <AdminAccounting />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <PrivateRoute papel="admin">
              <AuditLogs />
            </PrivateRoute>
          }
        />

        {/* Rotas CLIENTE */}
        <Route
          path="/cliente"
          element={
            <PrivateRoute papel="cliente">
              <ClienteDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/contabilidade"
          element={
            <PrivateRoute papel="cliente">
              <ClientAccounting />
            </PrivateRoute>
          }
        />

        {/* Qualquer outra rota → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <footer className="copyright">
        &copy; 2025 Jorge Mabuie. Todos os direitos reservados.
      </footer>
    </>
  );
}
