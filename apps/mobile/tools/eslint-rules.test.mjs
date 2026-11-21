import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ESLint, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import project from './eslint-rules.mjs';
import config from '../eslint.config.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

tester.run('no-effect-work', project.rules['no-effect-work'], {
  valid: [
    'const value = items.filter(Boolean);',
    'useEffect(() => { const id = setInterval(() => setPosition(1), 16); return () => clearInterval(id); }, []);',
    'useEffect(() => subscribe(() => setPosition(1)), []);',
    'const submit = () => mutation.mutate(data);',
  ],
  invalid: [
    'useEffect(() => { fetch(url); }, []);',
    'useEffect(() => { setItems(data); }, [data]);',
    'useEffect(() => { mutation.mutate(data); }, [data]);',
    'import {useEffect as effect} from "react"; effect(() => { fetch(url); }, []);',
    'import {read as open} from "@core/api/chapters"; useEffect(() => { open(id); }, [id]);',
    'function reload() { fetch(url); } useEffect(() => { reload(); }, []);',
    'const reload = () => fetch(url); useEffect(reload, []);',
    'React.useEffect(async () => 1, []);',
  ].map(code => ({ code, errors: [{ messageId: 'violation' }] })),
});

tester.run('no-barrels', project.rules['no-barrels'], {
  valid: ['export type Chapter = {text: string};', 'export default function Route() { return null; }'],
  invalid: ['export * from "./chapter";', 'export {Chapter} from "./chapter";'].map(code => ({ code, errors: [{ messageId: 'violation' }] })),
});

tester.run('relative-layers', project.rules['relative-layers'], {
  valid: [
    { code: 'import x from "@core/config";', filename: '/project/src/screens/home.ts' },
    { code: 'import x from "./config";', filename: '/project/src/core/api.ts' },
  ],
  invalid: [{ code: 'import x from "../core/config";', filename: '/project/src/screens/home.ts', errors: [{ messageId: 'violation' }] }],
});

it('the real lint configuration rejects upward dependencies and TypeScript escapes', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'voxnovel-lint-'));
  const layers = ['core', 'ui', 'pattern', 'layouts', 'features', 'screens'];
  try {
    for (const layer of layers) {
      mkdirSync(path.join(root, 'src', layer), { recursive: true });
      writeFileSync(path.join(root, 'src', layer, 'module.ts'), 'export const value = 1;');
    }
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { paths: Object.fromEntries(layers.map(layer => [`@${layer}/*`, [`./src/${layer}/*`]])) } }));
    const lint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: config.map(entry => entry.settings ? {
        ...entry,
        settings: { ...entry.settings, 'boundaries/root-path': root, 'import/resolver': { typescript: { project: path.join(root, 'tsconfig.json') } } },
      } : entry),
    });
    for (const [from, to] of [['core', 'screens'], ['ui', 'features'], ['pattern', 'features'], ['layouts', 'screens'], ['features', 'screens']]) {
      const [result] = await lint.lintText(`import {value} from '@${to}/module'; export const result = value;`, { filePath: path.join(root, 'src', from, 'test.ts') });
      assert(result.messages.some(message => message.ruleId === 'boundaries/dependencies'), JSON.stringify(result.messages));
    }
    const [valid] = await lint.lintText("import {value} from '@core/module'; export const result = value;", { filePath: path.join(root, 'src/screens/test.ts') });
    assert.equal(valid.errorCount, 0, JSON.stringify(valid.messages));
    const [escapes] = await lint.lintText('export interface Item { text: string }; export const value = input as string;', { filePath: path.join(root, 'src/core/test.ts') });
    assert(escapes.messages.some(message => message.ruleId === '@typescript-eslint/consistent-type-definitions'));
    assert(escapes.messages.some(message => message.ruleId === 'no-restricted-syntax'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
