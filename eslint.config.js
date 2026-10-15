import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  { ignores: ['dist', 'public', 'node_modules', 'playwright-report', 'test-results', 'smoke.mjs'] },
  { files: ['**/*.{ts,tsx}'], extends: [js.configs.recommended, ...tseslint.configs.recommended], languageOptions: { globals: { ...globals.browser, ...globals.node } }, plugins: { 'react-hooks': reactHooks }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' } }
);
