const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { IgnorePlugin, optimize } = require('webpack');
const { join } = require('path');

const bundleAll = process.env.BUNDLE_ALL === '1';

// Dependencias OPCIONALES que Nest y `pg` cargan dentro de un try/catch
// (loadPackage / optional-require). No están instaladas: si webpack intenta
// resolverlas, el build termina con exit 1 aunque emita el bundle. Ignoradas,
// el `require` falla en runtime igual que hoy y Nest/pg lo capturan.
// (Van por IgnorePlugin: NxAppWebpackPlugin pisa `externals` con 'none'.)
const OPTIONAL_MODULES =
  /^(@nestjs\/microservices|@nestjs\/websockets\/socket-module|class-transformer|class-validator|pg-native)/;

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    ...(bundleAll
      ? [
          new IgnorePlugin({ resourceRegExp: OPTIONAL_MODULES }),
          // Un solo archivo: el cliente de Prisma usa import() dinámico y webpack lo
          // partía en un chunk (1.js) que el deploy no copiaba → "Cannot find module './1.js'"
          // al arrancar con REPOSITORY_MODE=prisma.
          new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
        ]
      : []),
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      // BUNDLE_ALL=1: un solo main.js autocontenido para el deploy en VM (sin node_modules).
      externalDependencies: bundleAll ? 'none' : 'all',
      sourceMap: true,
    }),
  ],
};
