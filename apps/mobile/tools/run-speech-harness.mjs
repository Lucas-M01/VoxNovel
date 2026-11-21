import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const mobile = path.resolve(import.meta.dirname, '..');
const repository = path.resolve(mobile, '../..');
const reader = process.argv.includes('--reader');
const slug = reader ? 'voxnovel-reader-harness' : 'voxnovel-speech-harness';
const project = path.join(repository, '.private', slug);
const require = createRequire(import.meta.url);
const dependencies = JSON.parse(await readFile(path.join(mobile, 'package.json'), 'utf8')).dependencies;
const names = ['expo', 'expo-speech', 'expo-file-system', 'react', 'react-native', '@tanstack/react-query', 'zod', '@react-native-community/netinfo'];
await mkdir(project, { recursive: true, mode: 0o700 });
await Promise.all([
  writeFile(path.join(project, 'package.json'), JSON.stringify({
    name: slug, version: '1.0.0', private: true, main: 'index.js',
    dependencies: Object.fromEntries(names.map(name => [name, dependencies[name]])),
  }, null, 2)),
  writeFile(path.join(project, 'app.json'), JSON.stringify({ expo: {
    name: reader ? 'VoxNovel — leitor privado' : 'VoxNovel — S1 privado', slug, version: '1.0.0',
    android: { package: reader ? 'app.voxnovel.readerharness' : 'app.voxnovel.speechharness' }, ios: { bundleIdentifier: reader ? 'app.voxnovel.readerharness' : 'app.voxnovel.speechharness' },
  } }, null, 2)),
  writeFile(path.join(project, 'index.js'), `import { registerRootComponent } from 'expo';\nimport Harness from '../../apps/mobile/tools/${reader ? "reader" : "speech"}-harness-screen';\nregisterRootComponent(Harness);\n`),
  writeFile(path.join(project, 'babel.config.cjs'), `const path = require('node:path');
module.exports = {
  presets: [require.resolve('babel-preset-expo')],
  plugins: [[require.resolve('babel-plugin-module-resolver'), {
    alias: Object.fromEntries(['core', 'ui', 'pattern', 'layouts', 'features', 'screens'].map(layer => ['@' + layer, path.resolve(__dirname, '../../apps/mobile/src', layer)])),
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  }]],
};
`),
  writeFile(path.join(project, 'metro.config.cjs'), String.raw`const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const root = path.resolve(__dirname, '../..');
config.watchFolders = [...new Set([...(config.watchFolders || []), root])];
config.resolver.nodeModulesPaths = [path.join(root, 'node_modules'), path.join(root, 'apps/mobile/node_modules')];
const inherited = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(inherited) ? inherited : inherited ? [inherited] : []), /[/\\]_legacy[/\\]/, /[/\\]\.venv[/\\]/];
module.exports = config;
`),
]);
console.log(`Harness privado preparado em .private/${slug}. Sem acesso à API ou dados pessoais.`);
if (!process.argv.includes('--prepare')) {
  const exporting = process.argv.includes('--export');
  const args = exporting
    ? ['export', '--platform', 'android', '--platform', 'ios', '--max-workers', '2', '--output-dir', 'dist']
    : ['start', ...(process.env.VOXNOVEL_HARNESS_PORT ? ['--port', process.env.VOXNOVEL_HARNESS_PORT] : [])];
  const child = spawn(process.execPath, [path.join(path.dirname(require.resolve('expo/package.json')), 'bin/cli'), ...args], {
    cwd: project, stdio: 'inherit', env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
  });
  child.on('error', () => { console.error('Não foi possível iniciar o harness.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
