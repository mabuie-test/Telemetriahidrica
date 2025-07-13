import React from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
