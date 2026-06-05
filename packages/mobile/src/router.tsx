import { createBrowserRouter } from 'react-router-dom';

import { App } from './App.js';
import { AgendaPage } from './pages/AgendaPage.js';
import { AssistantPage } from './pages/AssistantPage.js';
import { CapturePage } from './pages/CapturePage.js';
import { DayClosingPage } from './pages/DayClosingPage.js';
import { EditorPage } from './pages/EditorPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { LibraryPage } from './pages/LibraryPage.js';
import { ReviewPage } from './pages/ReviewPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <AgendaPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'day-closing', element: <DayClosingPage /> },
      { path: 'capture', element: <CapturePage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'editor', element: <EditorPage /> },
      { path: 'editor/:noteId', element: <EditorPage /> },
      { path: 'assistant', element: <AssistantPage /> },
    ],
  },
]);
