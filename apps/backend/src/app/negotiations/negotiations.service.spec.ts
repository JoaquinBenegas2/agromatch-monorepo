import { Test, type TestingModule } from '@nestjs/testing';
import type { BreedingGoal, User } from '@org/shared-types';
import { users } from '@org/shared-types/fixtures';
import { ClassificationService } from '../../classification/classification.service.js';
import { createMemoryProviders } from '../../repos/memory.providers.js';
import { FEMALE_REPO, type FemaleRepo } from '../../repos/female.port.js';
import {
  NEGOTIATION_REPO,
  type NegotiationRepo,
} from '../../repos/negotiation.port.js';
import { GeneticMatchingService } from '../genetic-matching/genetic-matching.service.js';
import { MatchContactService } from '../genetic-matching/match-contact.service.js';
import { RequestsService } from '../requests/requests.service.js';
import { PlanService } from '../planning/plan.service.js';
import { NegotiationsService } from './negotiations.service.js';

const goal: BreedingGoal = {
  preset: 'BALANCED',
  weights: {},
  wantBetaA2: false,
  wantKappaBB: false,
};
const user: User = {
  id: 'tambero-a',
  name: 'Tambero A',
  role: 'FARMER',
  farmIds: ['farm-a'],
};
describe('Final negotiation flow with memory repositories and real engines', () => {
  let module: TestingModule;
  let contacts: MatchContactService;
  let negotiations: NegotiationsService;
  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ...createMemoryProviders(),
        ClassificationService,
        GeneticMatchingService,
        RequestsService,
        PlanService,
        MatchContactService,
        NegotiationsService,
      ],
    }).compile();
    contacts = module.get(MatchContactService);
    negotiations = module.get(NegotiationsService);
  });
  afterEach(async () => {
    await module.close();
  });
  async function selectedMatch() {
    await module.get(ClassificationService).classify('farm-a', goal);
    const candidate = (
      await module
        .get(GeneticMatchingService)
        .getBoard('farm-a', 'f-3021', goal)
    ).ranked[0];
    expect(candidate).toBeDefined();
    await module
      .get(PlanService)
      .addItem('farm-a', {
        femaleId: 'f-3021',
        bullNaab: candidate.capabilityId,
        goal,
        semenType: 'BEEF',
        compatibility: -1,
        pricePerDose: 0,
      });
    return candidate;
  }
  it('requires a saved match before contacting the provider', async () => {
    await expect(
      contacts.contact(
        'farm-a',
        'f-3021',
        '029HO20100',
        { goal, message: 'Hola' },
        user,
      ),
    ).rejects.toMatchObject({ code: 'MATCH_NOT_SELECTED' });
    expect(await negotiations.list(user)).toEqual([]);
  });
  it('connects the selected pair to one final chat and the provider can answer', async () => {
    const candidate = await selectedMatch();
    const body = { goal, message: '¿Tienen una dosis disponible?' };
    const request = await contacts.contact(
      'farm-a',
      'f-3021',
      candidate.capabilityId,
      body,
      user,
    );
    expect(
      (
        await contacts.contact(
          'farm-a',
          'f-3021',
          candidate.capabilityId,
          body,
          user,
        )
      ).id,
    ).toBe(request.id);
    const provider = users.find(
      (u) => u.role === 'PROVIDER' && u.providerId === candidate.providerId,
    );
    expect(provider).toBeDefined();
    if (!provider) throw new Error('Missing provider fixture');
    expect(await negotiations.list(provider)).toHaveLength(1);
    const answer = await negotiations.sendMessage(
      request.id,
      { body: 'Sí, tenemos disponibilidad.' },
      provider,
    );
    expect(answer.status).toBe('ANSWERED');
    expect(answer.messages).toHaveLength(2);
    expect(answer.messages[1].senderType).toBe('PROVIDER');
    expect(answer.subject).toContain('3021');
    expect(answer.messages[0].body).toContain('BALANCED');
    expect((await negotiations.get(request.id, user)).messages[1].body).toBe(
      'Sí, tenemos disponibilidad.',
    );
    expect(await negotiations.list(user)).toHaveLength(1);
  });
  it('isolates farmers and supplier accounts and rejects closed conversations', async () => {
    const candidate = await selectedMatch();
    const request = await contacts.contact(
      'farm-a',
      'f-3021',
      candidate.capabilityId,
      { goal, message: 'Consulta' },
      user,
    );
    const other = { ...user, id: 'tambero-b', farmIds: ['farm-b'] };
    expect(await negotiations.list(other)).toEqual([]);
    await expect(negotiations.get(request.id, other)).rejects.toMatchObject({
      code: 'NEGOTIATION_FORBIDDEN',
    });
    await expect(
      negotiations.sendMessage(
        request.id,
        { body: 'No autorizado' },
        {
          ...user,
          role: 'PROVIDER',
          providerId: 'other-provider',
          farmIds: [],
        },
      ),
    ).rejects.toMatchObject({ code: 'NEGOTIATION_FORBIDDEN' });
    await module
      .get<NegotiationRepo>(NEGOTIATION_REPO)
      .append(
        request.id,
        {
          senderUserId: user.id,
          senderName: user.name,
          senderType: 'CUSTOMER',
          body: 'Cierre de prueba',
        },
        'DONE',
      );
    await expect(
      negotiations.sendMessage(request.id, { body: 'Tarde' }, user),
    ).rejects.toMatchObject({ code: 'NEGOTIATION_CLOSED' });
  });
  it('isolates memory state and preserves identities when replacing an import', async () => {
    const repo = module.get<FemaleRepo>(FEMALE_REPO);
    const before = await repo.listByFarm('farm-a'),
      other = await repo.listByFarm('farm-b');
    const original = structuredClone(before[0]);
    before[0].visualId = 'mutated browser object';
    expect((await repo.findById('farm-a', original.id))?.visualId).toBe(
      original.visualId,
    );
    await repo.upsertMany('farm-a', [
      { ...original, id: 'incoming-new-id', profile: null },
    ]);
    expect(await repo.listByFarm('farm-a')).toEqual([
      { ...original, profile: null },
    ]);
    expect(await repo.listByFarm('farm-b')).toEqual(other);
  });
});
