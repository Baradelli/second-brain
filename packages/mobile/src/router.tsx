import { createBrowserRouter } from 'react-router-dom';

import { App } from './App.js';
import { AgendaPage } from './pages/AgendaPage.js';
import { AssistantPage } from './pages/AssistantPage.js';
import { CalendarPage } from './pages/CalendarPage.js';
import { CapturePage } from './pages/CapturePage.js';
import { DayClosingPage } from './pages/DayClosingPage.js';
import { DayDetailPage } from './pages/DayDetailPage.js';
import { EditorPage } from './pages/EditorPage.js';
import { GoalsPage } from './pages/GoalsPage.js';
import { LabelsPage } from './pages/LabelsPage.js';
import { LibraryPage } from './pages/LibraryPage.js';
import { NotesPage } from './pages/NotesPage.js';
import { RecapsPage } from './pages/RecapsPage.js';
import { ResourceDetailPage } from './pages/ResourceDetailPage.js';
import { ReviewPage } from './pages/ReviewPage.js';
import { SearchPage } from './pages/SearchPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <AgendaPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'library/:id', element: <ResourceDetailPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'day-closing', element: <DayClosingPage /> },
      { path: 'capture', element: <CapturePage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'calendar/:date', element: <DayDetailPage /> },
      { path: 'recaps', element: <RecapsPage /> },
      { path: 'labels', element: <LabelsPage /> },
      { path: 'editor', element: <EditorPage /> },
      { path: 'editor/:noteId', element: <EditorPage /> },
      { path: 'assistant', element: <AssistantPage /> },
    ],
  },
]);
