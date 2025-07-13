import React, { useEffect } from 'react';             // ✅ Importar useEffect
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import Login             from './components/Login';
import AdminDashboard    from './components/AdminDashboard';
import UsersList         from './components/UsersList';
import MedidoresList     from './components/MedidoresList';
import ReadingsIngest    from './components/ReadingsIngest';
import ReadingsView      from './components/ReadingsView';
import FailuresAlerts    from './components/FailuresAlerts';
import ReportsGenerate   from './components/ReportsGenerate';
import AuditLogs         from './components/AuditLogs';
import ClienteDashboard  from './components/ClienteDashboard';

export default function App() {
  // 👉 useEffect deve estar DENTRO do componente
  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, source, lineno, colno, error);
      alert(`Erro detectado: ${message}\nEm: ${source}:${lineno}`);
    };
  }, []);

  return (
    <HashRouter>
      {/* Debug banner para confirmar montagem */}
      <div style={{
        background: '#0f0', color: '#000',
        textAlign: 'center',
        padding: '0.5rem',
        fontWeight: 'bold'
      }}>
        ✅ React iniciou em App.js
      </div>

      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rotas Admin */}
        <Route path="/admin" element={
          <PrivateRoute papel="admin"><AdminDashboard/></PrivateRoute>
        }/>
        <Route path="/admin/users" element={
          <PrivateRoute papel="admin"><UsersList/></PrivateRoute>
        }/>
        <Route path="/admin/medidores" element={
          <PrivateRoute papel="admin"><MedidoresList/></PrivateRoute>
        }/>
        <Route path="/admin/ingest" element={
          <PrivateRoute papel="admin"><ReadingsIngest/></PrivateRoute>
        }/>
        <Route path="/admin/view" element={
          <PrivateRoute papel="admin"><ReadingsView/></PrivateRoute>
        }/>
        <Route path="/admin/fail-alerts" element={
          <PrivateRoute papel="admin"><FailuresAlerts/></PrivateRoute>
        }/>
        <Route path="/admin/reports" element={
          <PrivateRoute papel="admin"><ReportsGenerate/></PrivateRoute>
        }/>
        <Route path="/admin/audit" element={
          <PrivateRoute papel="admin"><AuditLogs/></PrivateRoute>
        }/>

        {/* Rota Cliente */}
        <Route path="/cliente" element={
          <PrivateRoute papel="cliente"><ClienteDashboard/></PrivateRoute>
        }/>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
