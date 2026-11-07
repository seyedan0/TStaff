import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return (
    <div dir="rtl" style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>سامانه مدیریت شبکه پژوهشگران (TStaff)</h1>
      <p>پوسته اولیه برنامه وب (React + Vite + TypeScript) - مرحله M0</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

