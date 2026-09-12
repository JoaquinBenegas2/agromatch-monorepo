import { NegotiationsService } from './negotiations.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const now = new Date('2026-09-12T18:00:00.000Z');
const request = {
  id: 'request-1',
  needId: 'need-1',
  providerId: 'prov-mainero',
  message: 'Necesito coordinar fecha',
  status: 'SENT',
  createdAt: now,
  createdByUserId: 'tambero-a',
  updatedAt: now,
  contactPhone: null,
  contactEmail: null,
  messages: [
    {
      id: 'message-1',
      serviceRequestId: 'request-1',
      senderUserId: 'tambero-a',
      senderName: 'Tambero A',
      senderType: 'CUSTOMER',
      body: 'Necesito coordinar fecha',
      createdAt: now,
    },
  ],
};

function makePrisma() {
  const prisma = {
    serviceRequest: {
      findMany: jest.fn().mockResolvedValue([request]),
      findUnique: jest.fn().mockResolvedValue(request),
      update: jest.fn().mockResolvedValue(request),
    },
    negotiationMessage: { create: jest.fn().mockResolvedValue(request.messages[0]) },
    need: {
      findMany: jest.fn().mockResolvedValue([{ id: 'need-1' }]),
      findUnique: jest.fn().mockResolvedValue({ id: 'need-1', farmId: 'farm-a', what: 'Arar 40 ha', category: 'MACHINERY' }),
    },
    provider: { findUnique: jest.fn().mockResolvedValue({ id: 'prov-mainero', name: 'Mainero', imageUrl: null }) },
    farm: { findUnique: jest.fn().mockResolvedValue({ id: 'farm-a', name: 'Tambo A' }) },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  };
  return prisma;
}

describe('NegotiationsService', () => {
  it('lista únicamente las solicitudes de los establecimientos del productor', async () => {
    const prisma = makePrisma();
    const service = new NegotiationsService(prisma as unknown as PrismaService);

    const result = await service.list({ id: 'tambero-a', name: 'Tambero A', role: 'FARMER', farmIds: ['farm-a'] });

    expect(prisma.need.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { farmId: { in: ['farm-a'] } } }));
    expect(result[0]).toMatchObject({ id: 'request-1', providerName: 'Mainero', farmName: 'Tambo A' });
  });

  it('permite al proveedor vinculado responder y cambia SENT a ANSWERED', async () => {
    const prisma = makePrisma();
    const answered = { ...request, status: 'ANSWERED' };
    prisma.serviceRequest.findUnique.mockResolvedValueOnce(request).mockResolvedValueOnce(answered);
    const service = new NegotiationsService(prisma as unknown as PrismaService);

    await service.sendMessage(
      'request-1',
      { body: 'Tenemos disponibilidad el martes.' },
      { id: 'proveedor-mainero', name: 'Mainero', role: 'PROVIDER', farmIds: [], providerId: 'prov-mainero' },
    );

    expect(prisma.negotiationMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ senderType: 'PROVIDER', body: 'Tenemos disponibilidad el martes.' }),
    });
    expect(prisma.serviceRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: { status: 'ANSWERED' },
    });
  });

  it('impide que una cuenta proveedora ajena lea la conversación', async () => {
    const service = new NegotiationsService(makePrisma() as unknown as PrismaService);

    await expect(
      service.get('request-1', {
        id: 'proveedor-zoovet',
        name: 'Zoovet',
        role: 'PROVIDER',
        farmIds: [],
        providerId: 'prov-zoovet',
      }),
    ).rejects.toMatchObject({ code: 'NEGOTIATION_FORBIDDEN' });
  });
});
