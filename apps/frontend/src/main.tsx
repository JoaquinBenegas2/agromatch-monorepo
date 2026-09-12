import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './app/app';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from './shared/api/query-client';
import { UserProvider } from './shared/user/user-context';

async function enableMocking() {
  if (import.meta.env['VITE_MOCKS'] !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

async function bootstrap() {
  await enableMocking();

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <BrowserRouter>
            <TooltipProvider>
              <App />
              <Toaster position="top-right" />
            </TooltipProvider>
          </BrowserRouter>
        </UserProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
