import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import AdminDashboard from './components/AdminDashboard';
import ClienteDashboard from './components/ClienteDashboard';

import UsersList from './components/UsersList';
import MedidoresList from './components/MedidoresList';
import ReadingsIngest from './components/ReadingsIngest';
import ReadingsView from './components/ReadingsView';
import FailuresAlerts from './components/FailuresAlerts';
import ReportsGenerate from './components/ReportsGenerate';
import AuditLogs from './components/AuditLogs';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />

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
          path="/admin/audit"
          element={
            <PrivateRoute papel="admin">
              <AuditLogs />
            </PrivateRoute>
          }
        />

        <Route
          path="/cliente"
          element={
            <PrivateRoute papel="cliente">
              <ClienteDashboard />
            </PrivateRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
