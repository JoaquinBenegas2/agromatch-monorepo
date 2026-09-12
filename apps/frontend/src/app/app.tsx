import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/app-shell.js';
import { ModulePage } from './shell/module-page.js';
import { UiKitPreview } from './ui-kit-preview.js';
import { MatchingScreen } from '../features/matching/matching-screen.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mercado" replace />} />
      <Route element={<AppShell />}>
        <Route path="/establecimiento" element={<ModulePage />} />
        <Route path="/mercado" element={<ModulePage />} />
        {/* D4 (mvp-d-match): pantalla real, más específica que el catch-all de abajo. */}
        <Route path="/motor-genetico/matching/:femaleId?" element={<MatchingScreen />} />
        <Route path="/motor-genetico/*" element={<ModulePage />} />
        <Route path="/negociacion/*" element={<ModulePage />} />
        <Route path="/ofertas" element={<ModulePage />} />
      </Route>
      <Route path="/ui-kit" element={<UiKitPreview />} />
    </Routes>
  );
}

export default App;
