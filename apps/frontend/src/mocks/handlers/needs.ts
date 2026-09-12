import { http, HttpResponse } from 'msw';
import { capabilities, needsSamples, providers, samples } from '@org/shared-types/fixtures';
import type {
  ApiError,
  CreateNeedBody,
  CreateServiceRequestBody,
  FilterResult,
  MatchCandidate,
  Need,
  UpdateNeedBody,
} from '@org/shared-types';

let sequence = 0;
const mockNeeds: Need[] = [];

function apiError(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
  const error: ApiError = { code, message, details };
  return HttpResponse.json(error, { status });
}

function ownedFarm(request: Request, farmId: string): boolean {
  const userId = request.headers.get('x-user-id');
  if (userId === 'tambero-a') return farmId === 'farm-a';
  if (userId === 'tambero-b') return farmId === 'farm-b';
  return userId === 'asesor-1' || userId === 'admin';
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const latA = (a.lat * Math.PI) / 180;
  const latB = (b.lat * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function candidateFor(need: Need, capabilityId: string): MatchCandidate | null {
  if (!need.where) return null;
  const capability = capabilities.find((item) => item.id === capabilityId);
  const provider = providers.find((item) => item.id === capability?.providerId);
  if (!capability || !provider) return null;
  const distance = distanceKm(need.where, provider.base);
  const passed = distance <= capability.coverageRadiusKm;
  const filters: FilterResult[] = [
    {
      rule: 'RN-31',
      passed,
      detail: passed
        ? `Cubre la ubicación: ${distance.toFixed(0)} km de distancia`
        : `No cubre la zona: ${distance.toFixed(0)} km supera su radio de ${capability.coverageRadiusKm} km`,
    },
  ];
  const proximity = Math.max(0, 1 - distance / Math.max(capability.coverageRadiusKm, 1));
  const templateFit = samples.matchBoardMachinery.ranked[0]?.fit;
  return {
    needId: need.id,
    capabilityId: capability.id,
    providerId: provider.id,
    score: proximity * 100,
    compatibility: 0,
    rank: 0,
    fit: {
      proximity,
      availability: templateFit?.availability ?? 1,
      capacity: templateFit?.capacity ?? 0.5,
      price: capability.priceFrom === undefined ? (templateFit?.price ?? 0.5) : 1 / Math.max(capability.priceFrom, 1),
      reputation: provider.reputation.avg === null ? 0.5 : provider.reputation.avg / 5,
    },
    filters,
    reasons: [filters[0]?.detail ?? 'Evaluado por el motor de matching'],
  };
}

export const needsHandlers = [
  http.post('/api/needs', async ({ request }) => {
    const body = (await request.json()) as CreateNeedBody;
    if (!ownedFarm(request, body.farmId)) {
      return apiError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403, { farmId: body.farmId });
    }
    if (body.rawText.includes('[error]')) {
      return apiError('LLM_UNAVAILABLE', 'El asistente de interpretación no está disponible', 503);
    }
    const sample = needsSamples.find((item) => item.rawText === body.rawText);
    const need: Need = sample
      ? {
          ...structuredClone(sample.need),
          id: `mock-need-${++sequence}`,
          farmId: body.farmId,
          rawText: body.rawText,
          confidence: { ...sample.need.confidence, ...(sample.need.category === 'MACHINERY' ? { window: 0.5 } : {}) },
        }
      : {
          id: `mock-need-${++sequence}`,
          farmId: body.farmId,
          rawText: body.rawText,
          category: 'OTHER',
          what: body.rawText,
          constraints: [],
          status: 'DRAFT',
          missingFields: ['category', 'where', 'window'],
          confidence: { category: 0.35, what: 0.7 },
          createdAt: new Date().toISOString(),
        };
    mockNeeds.push(need);
    return HttpResponse.json(need);
  }),

  http.patch('/api/needs/:id', async ({ params, request }) => {
    const index = mockNeeds.findIndex((need) => need.id === params['id']);
    if (index < 0) return apiError('NEED_NOT_FOUND', 'La necesidad no existe', 404, { needId: params['id'] });
    const current = mockNeeds[index];
    if (!current || !ownedFarm(request, current.farmId)) {
      return apiError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403);
    }
    const body = (await request.json()) as UpdateNeedBody;
    const next: Need = {
      ...current,
      ...body,
      id: current.id,
      farmId: current.farmId,
      rawText: current.rawText,
      status: body.confirm ? 'OPEN' : current.status,
      missingFields: body.confirm ? undefined : current.missingFields,
    };
    if (body.confirm && next.category !== 'GENETICS' && (!next.where || !next.window)) {
      const missingFields = [!next.where ? 'where' : null, !next.window ? 'window' : null].filter(Boolean);
      return apiError('NEED_INCOMPLETE', 'Completá fecha y lugar antes de buscar proveedores', 409, { missingFields });
    }
    mockNeeds[index] = next;
    return HttpResponse.json(next);
  }),

  http.get('/api/needs', ({ request }) => {
    const url = new URL(request.url);
    const farmId = url.searchParams.get('farmId');
    if (farmId && !ownedFarm(request, farmId)) {
      return apiError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403, { farmId });
    }
    return HttpResponse.json(mockNeeds.filter((need) => !need.synthetic && (!farmId || need.farmId === farmId)));
  }),

  http.post('/api/needs/:id/matches', ({ params, request }) => {
    const need = mockNeeds.find((item) => item.id === params['id']);
    if (!need) return apiError('NEED_NOT_FOUND', 'La necesidad no existe', 404, { needId: params['id'] });
    if (!ownedFarm(request, need.farmId)) return apiError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403);
    if (need.status === 'DRAFT') return apiError('NEED_NOT_CONFIRMED', 'Confirmá la necesidad antes de buscar proveedores', 409);

    const candidates = capabilities
      .filter((capability) => capability.category === need.category)
      .map((capability) => candidateFor(need, capability.id))
      .filter((candidate): candidate is MatchCandidate => candidate !== null);
    const included = candidates.filter((candidate) => candidate.filters.every((filter) => filter.passed));
    included.sort((a, b) => b.score - a.score);
    const ranked = included.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      compatibility: included.length <= 1 ? 100 : Math.round((100 * (included.length - index)) / included.length),
    }));
    const excluded = candidates.filter((candidate) => candidate.filters.some((filter) => !filter.passed));
    need.status = 'MATCHED';
    return HttpResponse.json({ ranked, excluded });
  }),

  http.get('/api/providers', ({ request }) => {
    const category = new URL(request.url).searchParams.get('category');
    const ids = category
      ? new Set(capabilities.filter((capability) => capability.category === category).map((capability) => capability.providerId))
      : null;
    return HttpResponse.json(
      providers.filter((provider) => !ids || ids.has(provider.id)).map(({ contact: _contact, ...provider }) => provider),
    );
  }),

  http.post('/api/needs/:id/requests', async ({ params, request }) => {
    const need = mockNeeds.find((item) => item.id === params['id']);
    if (!need) return apiError('NEED_NOT_FOUND', 'La necesidad no existe', 404);
    if (!ownedFarm(request, need.farmId)) return apiError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403);
    const body = (await request.json()) as CreateServiceRequestBody;
    const provider = providers.find((item) => item.id === body.providerId);
    if (!provider) return apiError('PROVIDER_NOT_FOUND', 'El proveedor no existe', 404);
    return HttpResponse.json({
      id: `mock-request-${++sequence}`,
      needId: need.id,
      providerId: provider.id,
      message: body.message,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      contact: provider.contact,
    });
  }),
];
