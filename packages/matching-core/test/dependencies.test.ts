import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Va primero: matching-core NO puede importar genetics-core (RN-35,
 * ADR-0002). El vertical se registra, el núcleo no lo conoce de antemano.
 */

const SRC_DIR = join(import.meta.dirname, '..', 'src');

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listTsFiles(full));
    } else if (entry.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('aislamiento de paquetes (REQ-A-03)', () => {
  it('ningún archivo de packages/matching-core/src importa @org/genetics-core ni una ruta relativa hacia él', () => {
    const files = listTsFiles(SRC_DIR);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/@org\/genetics-core/);
      expect(content).not.toMatch(/genetics-core/);
    }
  });
});
