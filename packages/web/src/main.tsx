import './index.css';
// Importar @cerebro/ui inicializa o i18next como efeito colateral.
import '@cerebro/ui';

import { isAuthenticated, renewSessionOnBoot } from '@cerebro/shared/client';
import { ThemeProvider } from '@cerebro/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';

import { LoginPage } from './auth/LoginPage.js';
import { RequireAuth } from './auth/RequireAuth.js';
import { Shell } from './shell/Shell.js';

// Renovação deslizante do JWT (Tarefa 76): cada abertura troca o token por um novo.
renewSessionOnBoot();

// Fase 0.4 — /login público; / protegido pela guarda de rota (RequireAuth).
// Já autenticado visitando /login é redirecionado para a home.
const router = createBrowserRouter([
  {
    path: '/login',
    element: isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />,
  },
  {
    element: <RequireAuth />,
    children: [{ path: '/', element: <Shell /> }],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark">
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
