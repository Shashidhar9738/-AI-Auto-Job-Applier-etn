import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';
import { Onboarding } from './Onboarding';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Onboarding />
  </React.StrictMode>,
);
