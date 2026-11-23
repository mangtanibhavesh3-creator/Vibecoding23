import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { QueueProvider } from './context/QueueContext.jsx';

// Pages (7 Application Routes)
import { HomePage } from './pages/HomePage.jsx';
import { JoinQueuePage } from './pages/JoinQueuePage.jsx';
import { MyStatusPage } from './pages/MyStatusPage.jsx';
import { ReceptionPage } from './pages/ReceptionPage.jsx';
import { BarberPage } from './pages/BarberPage.jsx';
import { DisplayTvPage } from './pages/DisplayTvPage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';

export const App = () => {
  return (
    <LanguageProvider>
      <QueueProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/join" element={<JoinQueuePage />} />
              <Route path="/status/:id" element={<MyStatusPage />} />
              <Route path="/reception" element={<ReceptionPage />} />
              <Route path="/barber/:name" element={<BarberPage />} />
              <Route path="/display" element={<DisplayTvPage />} />
              <Route path="/admin" element={<AdminPage />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MotionConfig>
      </QueueProvider>
    </LanguageProvider>
  );
};

export default App;
