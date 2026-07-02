import './index.css';
import '@cerebro/ui';

import { renewSessionOnBoot } from '@cerebro/shared/client';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './router.js';

// Renovação deslizante do JWT (Tarefa 76): cada abertura troca o token por um novo.
renewSessionOnBoot();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
