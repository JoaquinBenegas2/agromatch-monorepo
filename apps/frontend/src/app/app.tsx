import { Navigate, Route, Routes } from 'react-router-dom';
import { PlanScreen } from '../features/plan/plan-screen.js';
import { AppShell } from './shell/app-shell.js';
import { ModulePage } from './shell/module-page.js';
import { UiKitPreview } from './ui-kit-preview.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mercado" replace />} />
      <Route element={<AppShell />}>
        <Route path="/establecimiento" element={<ModulePage />} />
        <Route path="/mercado" element={<ModulePage />} />
        <Route path="/motor-genetico/*" element={<ModulePage />} />
        <Route path="/negociacion/plan" element={<PlanScreen />} />
        <Route path="/negociacion/*" element={<ModulePage />} />
        <Route path="/ofertas" element={<ModulePage />} />
      </Route>
      <Route path="/ui-kit" element={<UiKitPreview />} />
    </Routes>
  );
}

export default App;
