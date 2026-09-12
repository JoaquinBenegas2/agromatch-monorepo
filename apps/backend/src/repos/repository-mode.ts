const mode = process.env['REPOSITORY_MODE'] ?? 'prisma';
if (mode !== 'prisma' && mode !== 'memory') {
  throw new Error('REPOSITORY_MODE must be prisma or memory');
}
export const useMemoryRepositories = mode === 'memory';
