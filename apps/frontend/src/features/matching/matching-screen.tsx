import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Compass, Dna } from 'lucide-react';
import type { BreedingGoal, GoalPreset, MatchCandidate } from '@org/shared-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { useActiveFarmId } from '../../shared/user/user-context.js';
import { useMatchBoard } from '../../shared/api/hooks/use-match-board.js';
import { useAddPlanItem, useRemovePlanItem } from '../../shared/api/hooks/use-plan-item-mutations.js';
import { useGoalParse } from '../../shared/api/hooks/use-goal-parse.js';
import { usePlan } from '../../shared/api/hooks/use-plan.js';
import { MatchRow } from './match-row.js';

const PRESETS: { id: GoalPreset; label: string }[] = [
  { id: 'BALANCED', label: 'Balanceado' },
  { id: 'SOLIDS_CHEESE', label: 'Más sólidos (quesera)' },
  { id: 'A2_MILK', label: 'Leche A2' },
  { id: 'VOLUME', label: 'Volumen' },
  { id: 'HEALTH_LONGEVITY', label: 'Salud y longevidad' },
  { id: 'EFFICIENCY', label: 'Eficiencia (RFI)' },
];

function presetGoal(preset: GoalPreset): BreedingGoal {
  return { preset, weights: {}, wantBetaA2: preset === 'A2_MILK', wantKappaBB: false };
}

/** El home del mercado (M6) deriva una necesidad GENETICS acá con su objetivo ya interpretado. */
function isBreedingGoal(value: unknown): value is BreedingGoal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'preset' in value &&
    'weights' in value &&
    typeof (value as { weights: unknown }).weights === 'object'
  );
}

export function MatchingScreen() {
  const { femaleId } = useParams<{ femaleId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFarmId] = useActiveFarmId();
  const incomingGoal = isBreedingGoal((location.state as { goal?: unknown } | null)?.goal)
    ? (location.state as { goal: BreedingGoal }).goal
    : null;
  const [text, setText] = useState(incomingGoal?.rawText ?? '');
  const [preset, setPreset] = useState<GoalPreset>(
    incomingGoal && incomingGoal.preset !== 'CUSTOM' ? incomingGoal.preset : 'BALANCED',
  );
  const [goal, setGoal] = useState<BreedingGoal>(incomingGoal ?? presetGoal('BALANCED'));
  const [searchId, setSearchId] = useState('');

  const farmId = activeFarmId ?? '';
  const board = useMatchBoard(farmId, femaleId, goal);
  const addItem = useAddPlanItem(farmId);
  const removeItem = useRemovePlanItem(farmId);
  const goalParse = useGoalParse();
  // REQ-D-14: el toro "En el plan" sale del plan real (B5), no de un estado
  // local — así al entrar desde /negociacion/plan ya viene marcado.
  const plan = usePlan(activeFarmId);
  const chosenNaab = plan.data?.items.find((item) => item.femaleId === femaleId)?.bullNaab ?? null;

  function handleProcesar() {
    // REQ-D-07: con texto vacío, usa el preset elegido sin llamar al LLM.
    if (!text.trim()) {
      setGoal(presetGoal(preset));
      return;
    }
    goalParse.mutate(text, {
      onSuccess: (parsed) => setGoal(parsed),
      onError: () => setGoal(presetGoal(preset)),
    });
  }

  function handleChoose(candidate: MatchCandidate) {
    if (!femaleId) return;
    if (chosenNaab === candidate.capabilityId) {
      removeItem.mutate(femaleId);
      return;
    }
    const facts = candidate.verticalFacts as { semenType?: string } | undefined;
    // El precio lo completa el backend desde el catálogo (los hechos no lo traen).
    addItem.mutate({
      femaleId,
      bullNaab: candidate.capabilityId,
      semenType: (facts?.semenType as never) ?? 'CONVENTIONAL',
      compatibility: candidate.compatibility,
      pricePerDose: null,
    });
  }

  const planError = addItem.error ?? removeItem.error;

  const ranked = board.data?.ranked ?? [];
  const excluded = board.data?.excluded ?? [];

  const objectiveBar = (
    <div className="flex items-center gap-3">
      <Input
        placeholder="quiero mejorar los sólidos de mi tambo"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1"
      />
      <Select value={preset} onValueChange={(v) => setPreset(v as GoalPreset)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="secondary" asChild>
        <Link to="/motor-genetico/importar">Subir Excel</Link>
      </Button>
      <Button onClick={handleProcesar} disabled={goalParse.isPending}>
        {goalParse.isPending ? 'Procesando…' : 'Procesar'}
      </Button>
    </div>
  );

  if (!femaleId) {
    return (
      <div className="flex flex-col gap-5">
        {objectiveBar}
        <EmptyState
          icon={<Dna />}
          title="Elegí una hembra"
          description="Buscá por ID visual (ej. 3031) o entrá desde el Tablero del rodeo."
          action={
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchId.trim()) navigate(`/motor-genetico/matching/${searchId.trim()}`);
              }}
            >
              <Input
                placeholder="ID visual de la hembra"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-[180px]"
              />
              <Button type="submit" size="sm">
                Ir
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/motor-genetico/tablero">Ver Tablero del rodeo</Link>
              </Button>
            </form>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {objectiveBar}

      <div className="flex items-center justify-between gap-4 rounded-lg bg-foreground p-4 text-background">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9.5px] font-semibold tracking-[0.14em] text-ink-4 uppercase">
            Tu hembra · contexto fijo para todo el listado
          </span>
          <span className="text-[17px] font-bold tracking-tight">{femaleId}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/motor-genetico/matching')}>
          Cambiar hembra
        </Button>
      </div>

      {board.isPending && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {board.isError && <ErrorMessage message={(board.error as Error).message} />}
      {planError && <ErrorMessage message={(planError as Error).message} />}

      {board.isSuccess && ranked.length === 0 && excluded.length === 0 && (
        <EmptyState icon={<Compass />} title="Sin candidatos" description="No hay toros evaluados todavía para esta hembra." />
      )}

      {board.isSuccess && ranked.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-semibold">Toros compatibles</span>
            <span className="text-[11.5px] text-muted-foreground">
              {ranked.length} evaluados contra tu hembra · ordenado por compatibilidad · {excluded.length} excluidos
            </span>
          </div>
          {ranked.map((candidate, i) => (
            <MatchRow
              key={candidate.capabilityId}
              candidate={candidate}
              farmId={farmId}
              femaleId={femaleId}
              goal={goal}
              defaultExpanded={i === 0}
              onChoose={handleChoose}
              inPlan={chosenNaab === candidate.capabilityId}
              choosing={addItem.isPending || removeItem.isPending}
              next={ranked[i + 1]}
            />
          ))}
        </div>
      )}

      {excluded.length > 0 && (
        <div className="flex flex-col gap-2">
          {excluded.map((candidate) => (
            <Card key={candidate.capabilityId} className="flex items-center gap-3 p-3 opacity-60">
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-destructive">
                Excluido: {candidate.filters.find((f) => !f.passed)?.detail ?? 'motivo no especificado'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
