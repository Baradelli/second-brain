import { createBrowserRouter } from 'react-router-dom';

import { App } from './App.js';
import { AgendaPage } from './pages/AgendaPage.js';
import { CapturePage } from './pages/CapturePage.js';
import { EditorPage } from './pages/EditorPage.js';
import { ReviewPage } from './pages/ReviewPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <AgendaPage /> },
      { path: 'capture', element: <CapturePage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'editor', element: <EditorPage /> },
      { path: 'editor/:noteId', element: <EditorPage /> },
    ],
  },
]);
