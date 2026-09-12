import { Navigate, Route, Routes } from 'react-router-dom';
import { PlanScreen } from '../features/plan/plan-screen.js';
import { AppShell } from './shell/app-shell.js';
import { ModulePage } from './shell/module-page.js';
import { UiKitPreview } from './ui-kit-preview.js';
import { AdvisorRoute } from '../features/advisor/advisor-route.js';
import { MarketplacePage } from '../features/market/marketplace-page.js';
import { MatchingScreen } from '../features/matching/matching-screen.js';
import { NotFoundPage } from './not-found-page.js';
import { NegotiationsPage } from '../features/negotiations/negotiations-page.js';
import { OffersPage } from '../features/offers/offers-page.js';
import { EstablishmentPage } from '../features/establishment/establishment-page.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mercado" replace />} />
      <Route element={<AppShell />}>
        <Route path="/establecimiento" element={<EstablishmentPage />} />
        <Route path="/mercado" element={<MarketplacePage />} />
        {/* D4 (mvp-d-match) y el anexo del asesor (mvp-b-need): pantallas reales, más específicas que el catch-all de abajo. */}
        <Route
          path="/motor-genetico/matching/:femaleId?"
          element={<MatchingScreen />}
        />
        <Route path="/motor-genetico/asesor" element={<AdvisorRoute />} />
        <Route path="/motor-genetico/*" element={<ModulePage />} />
        <Route path="/negociacion/plan" element={<PlanScreen />} />
        <Route
          path="/negociacion/matches/:id?"
          element={<NegotiationsPage />}
        />
        <Route path="/negociacion/*" element={<ModulePage />} />
        <Route path="/ofertas" element={<OffersPage />} />
        {/* Cualquier URL que no exista: mensaje y salida dentro del shell, nunca una pantalla en blanco. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/ui-kit" element={<UiKitPreview />} />
    </Routes>
  );
}

export default App;
