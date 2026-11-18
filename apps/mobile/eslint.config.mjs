import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
