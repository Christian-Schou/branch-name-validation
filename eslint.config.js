import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const compat = new FlatCompat({ baseDirectory: dirname });

export default [
  // Airbnb base JS rules for all TS and JS files
  ...compat.extends('airbnb-base').map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.js'],
  })),
  // TypeScript rules using typescript-eslint v8 flat config directly
  {
    files: ['**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Disable base rules superseded by TypeScript-aware equivalents
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',
      // TypeScript handles module resolution and extensions — disable import plugin checks
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'max-len': ['error', 170],
    },
  },
  // Allow devDependencies imports in JS files (e.g. build scripts)
  {
    files: ['**/*.js'],
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
];
