import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'functions/lib/**'] },
  ...tseslint.configs.recommended,
  {
    // Seul repositories/ (et services/) importe le SDK Firebase
    files: ['apps/**/*.ts', 'packages/shared/src/{models,domain,validation,utils}/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['firebase/*'] }],
    },
  },
  {
    // packages/shared n'importe jamais apps/*
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/apps/**', '@celeste/public', '@celeste/admin'] }],
    },
  },
);
