import type { MappingProposal } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import { InMemoryHerdImportRepo } from './herd-import.repo.js';

describe('InMemoryHerdImportRepo', () => {
  it('save + get redondea el mismo archivo y propuesta', async () => {
    const repo = new InMemoryHerdImportRepo(new MemoryStore());
    const file = new Uint8Array([1, 2, 3]);
    const proposal = { mappings: [] } as unknown as MappingProposal;

    await repo.save('import-1', 'farm-a', file, 'rodeo.xlsx', proposal);
    const stored = await repo.get('import-1');

    expect(stored?.farmId).toBe('farm-a');
    expect(stored?.filename).toBe('rodeo.xlsx');
    expect(stored?.file).toEqual(file);
    expect(stored?.proposal).toEqual(proposal);
  });

  it('get devuelve null si no existe', async () => {
    const repo = new InMemoryHerdImportRepo(new MemoryStore());

    await expect(repo.get('no-existe')).resolves.toBeNull();
  });

  it('save sobre el mismo id actualiza (upsert)', async () => {
    const repo = new InMemoryHerdImportRepo(new MemoryStore());
    const proposal = { mappings: [] } as unknown as MappingProposal;
    await repo.save('import-1', 'farm-a', new Uint8Array([1]), 'a.xlsx', proposal);

    await repo.save('import-1', 'farm-b', new Uint8Array([2]), 'b.xlsx', proposal);
    const stored = await repo.get('import-1');

    expect(stored?.farmId).toBe('farm-b');
    expect(stored?.filename).toBe('b.xlsx');
  });
});
