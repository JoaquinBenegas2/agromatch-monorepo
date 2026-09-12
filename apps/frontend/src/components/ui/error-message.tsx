import * as React from 'react';
import { CircleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ErrorMessageProps extends Omit<React.ComponentProps<typeof Alert>, 'children' | 'variant' | 'title'> {
  /** El mensaje tal como lo manda el backend. Nunca reemplazarlo por un texto genérico. */
  message: string;
  title?: React.ReactNode;
}

/**
 * MensajeError. Regla de negocio: siempre se muestra el `message` real del
 * backend, nunca "algo salió mal" ni variantes inventadas por la UI.
 */
function ErrorMessage({ message, title = 'No se pudo completar la acción', ...props }: ErrorMessageProps) {
  return (
    <Alert variant="destructive" {...props}>
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export { ErrorMessage };
