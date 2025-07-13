import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function PrivateRoute({ children, papel }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  if (papel && user.papel !== papel) return <Navigate to="/" />;
  return children;
}
