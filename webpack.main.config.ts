import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  /**
   * Electron 主进程入口
   */
  entry: './src/index.ts',
  module: {
    rules,
  },
  plugins: plugins,

  // ✅ 核心修改部分
  externals: {
    // 告诉 Webpack 这是一个外部模块，在运行时使用 Node.js 的 require('playwright')
    'playwright': 'playwright',
    'playwright-core': 'playwright-core',
    'bufferutil': 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
  },

  // 保持这个设置，告诉 Webpack 目标是 Node.js 环境
  externalsPresets: { node: true },

  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    fallback: {
      '@aws-sdk/client-s3': false,
    },
  },
};