import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import AdminDashboard from './components/AdminDashboard';
import ClienteDashboard from './components/ClienteDashboard';

export default function App() {
  return (
    <HashRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={
          <PrivateRoute papel="admin">
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/cliente" element={
          <PrivateRoute papel="cliente">
            <ClienteDashboard />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
}
