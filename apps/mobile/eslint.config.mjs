import path from 'node:path';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import hooks from 'eslint-plugin-react-hooks';
import project from './tools/eslint-rules.mjs';

const root = import.meta.dirname;
const layers = ['core', 'ui', 'pattern', 'layouts', 'features', 'screens'];
const allowed = {
  core: ['core'],
  ui: ['core', 'ui'],
  pattern: ['core', 'ui', 'pattern'],
  layouts: ['core', 'ui', 'layouts'],
  features: ['core', 'ui', 'pattern', 'layouts', 'features'],
  screens: layers,
};

export default tseslint.config(
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**', 'android/**', 'ios/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable', __dirname: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { boundaries, 'react-hooks': hooks, project },
    settings: {
      'boundaries/root-path': root,
      'boundaries/elements': [
        ...layers.map(type => ({ type, pattern: `src/${type}` })),
        { type: 'screens', pattern: 'app' },
      ],
      'import/resolver': { typescript: { project: path.join(root, 'tsconfig.json') } },
    },
    rules: {
      ...boundaries.configs.strict.rules,
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: Object.entries(allowed).map(([from, to]) => ({
          from: { element: { type: from } },
          allow: { to: { element: { types: to } } },
        })),
      }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-restricted-syntax': ['error',
        { selector: 'TSAsExpression', message: 'Validate and narrow values instead of casting with as.' },
        { selector: 'TSTypeAssertion', message: 'Validate and narrow values instead of casting.' },
      ],
      'project/relative-layers': 'error',
      'project/no-barrels': 'error',
      'project/no-effect-work': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'error',
    },
  },
);
