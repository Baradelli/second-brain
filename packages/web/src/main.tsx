import React from 'react';
import ReactDOM from 'react-dom/client';

// Placeholder. O setup real (i18n, roteamento, cliente HTTP) entra na Tarefa 19;
// as telas, nas Tarefas 20–23. Web e mobile importam o grosso de @cerebro/ui e @cerebro/shared.
function App() {
  return <h1>Segundo Cérebro — web</h1>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
