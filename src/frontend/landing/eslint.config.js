import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import tailwindPlugin from 'eslint-plugin-tailwindcss'
import globals from 'globals'

export default [
    {
        ignores: ['dist/', 'node_modules/', '*.config.*']
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 'latest',
                sourceType: 'module'
            },
            globals: {
                ...globals.browser,
                ...globals.es2020
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin,
            import: importPlugin,
            tailwindcss: tailwindPlugin
        },
        settings: {
            react: { version: 'detect' },
            'import/resolver': {
                typescript: { project: './tsconfig.json' }
            }
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'tailwindcss/no-custom-classname': 'off'
        }
    }
]
