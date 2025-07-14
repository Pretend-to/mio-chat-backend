// eslint.config.js

import globals from 'globals' // 导入预定义的全局变量，例如 node, browser 等
import eslint from '@eslint/js' // 导入 ESLint 自身提供的推荐配置

export default [
  {
    // 应用 ESLint 官方推荐的规则
    // 这等同于旧配置中的 'extends: eslint:recommended'
    ...eslint.configs.recommended,

    // 语言选项配置，替代了旧配置中的 parserOptions 和 env
    languageOptions: {
      // 设置 JavaScript 语言版本为最新（latest），等同于 ecmaVersion: latest
      ecmaVersion: 'latest',
      // 设置源码类型为模块（module），等同于 sourceType: module
      sourceType: 'module',
      // 定义全局变量
      globals: {
        // 启用 Node.js 环境的全局变量，等同于 env.node: true
        ...globals.node,
        // 'browser: false' 表示不启用浏览器环境的全局变量。
        // 在 Node.js 项目中，这是默认行为，所以通常不需要额外指定。
        // 如果您的项目是浏览器环境，则可以添加 ...globals.browser。

        // 自定义全局变量，等同于旧配置中的 globals
        middleware: 'readonly',
        logger: 'readonly',
      },
    },

    // 自定义规则配置
    rules: {
      // 以下规则会覆盖或添加 ESLint 推荐配置中的规则
      // camelcase: error
      camelcase: 'error',
      // semi: ['error', 'never']
      semi: ['error', 'never'],
      // quotes: ['error', 'single']
      quotes: ['error', 'single'],
      // indent: ['error', 2 ,{ "SwitchCase": 1 }]
      indent: ['error', 2, { SwitchCase: 1 }],
      // no-undef: error
      // no-undef 规则已经包含在 eslint.configs.recommended 中，
      // 但为了与您原配置保持一致，仍显式列出。
      'no-undef': 'error',
    },
  },
]
