import type { ExplanationFacts, MatchCandidate } from '@org/shared-types';
import { cn } from '@/lib/utils';

interface MatchRowProps {
  candidate: MatchCandidate;
  active: boolean;
  onSelect: (candidate: MatchCandidate) => void;
}

/** Fila compacta del ranking (.candidate del mockup): nombre, central y el
 * primer motivo determinístico. El detalle completo vive en el result-panel
 * de matching-screen.tsx, no acá — igual que en la referencia. */
export function MatchRow({ candidate, active, onSelect }: MatchRowProps) {
  const facts = candidate.verticalFacts as ExplanationFacts | undefined;
  return (
    <button type="button" className={cn('candidate', active && 'active')} onClick={() => onSelect(candidate)}>
      <span className="rank-number">{String(candidate.rank).padStart(2, '0')}</span>
      <div>
        <strong>{facts?.bull.name ?? candidate.capabilityId}</strong>
        <small>
          {facts?.bull.company ?? 'Sin central'} · #{candidate.rank} de {facts?.totalCandidates ?? '—'} · {candidate.compatibility}
        </small>
        {candidate.reasons[0] && <p className="reason">{candidate.reasons[0]}</p>}
      </div>
    </button>
  );
}
