import { MemoryStore } from './memory-store.js';
import { InMemoryUserRepo } from './user.repo.js';

describe('InMemoryUserRepo', () => {
  it('encuentra un usuario sembrado por id', async () => {
    const repo = new InMemoryUserRepo(new MemoryStore());

    const user = await repo.findById('tambero-a');

    expect(user).toEqual({ id: 'tambero-a', name: 'Tambero A', role: 'FARMER', farmIds: ['farm-a'] });
  });

  it('devuelve null si el usuario no existe', async () => {
    const repo = new InMemoryUserRepo(new MemoryStore());

    await expect(repo.findById('no-existe')).resolves.toBeNull();
  });

  it('devuelve una copia, no la referencia interna', async () => {
    const store = new MemoryStore();
    const repo = new InMemoryUserRepo(store);

    const user = await repo.findById('tambero-a');
    user!.farmIds.push('farm-z');

    expect(store.users.get('tambero-a')!.farmIds).toEqual(['farm-a']);
  });
});
