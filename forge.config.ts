import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import * as path from 'path';
import * as fs from 'fs'; // fs 模块已在你的文件中引入

// 🚀 新增：读取 package.json 以获取生产依赖列表
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const productionDependencies = packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];

const config: ForgeConfig = {
  // 核心修正 2: 使用 as any 避免 'asarUnpack' 的类型错误
  packagerConfig: {
    // 1. 显式关闭 ASAR 打包
    asar: false,

    // 2. 当 asar 为 false 时，asarUnpack 不需要，移除或注释掉
    // asarUnpack: [
    //   '**\\node_modules\\playwright\\**', // Windows
    //   '**/node_modules/playwright/**', // Linux/macOS
    //   '**\\node_modules\\playwright-core\\**', // Windows 核心包
    //   '**/node_modules/playwright-core/**',   // Linux/macOS 核心包
    // ],

    icon: path.resolve(__dirname, 'icon/icon'), // 不加扩展名

    // 打包时将 React 构建产物复制到资源目录
    extraResource: [
      path.resolve(__dirname, './dist/renderer'),
      path.resolve(__dirname, './icon'),
    ],
  } as any, // <--- 使用 as any 解决类型报错

  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    // 3. AutoUnpackNativesPlugin 仅用于 ASAR 打包，移除
    // new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // 4. 既然关闭了 ASAR，这个选项也应该关闭
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],

  // 🚀 核心修复：使用 hooks 手动复制 node_modules
  hooks: {
    /**
     * postPackage 钩子在应用程序打包（Package）完成后但在制作安装包（Make）前执行。
     */
    postPackage: async (forgeConfig, options) => {
      // 1. 定义源目录 (项目的根 node_modules)
      const srcNodeModules = path.join(process.cwd(), 'node_modules');

      // 2. 修正目标目录：当 asar: false 时，应用文件在 resources/app/
      const appPackageBase = options.outputPaths[0];
      // 修正：目标路径必须包含 'resources/app/'
      const destNodeModules = path.join(appPackageBase, 'resources', 'app', 'node_modules');

      console.log(`\n\n[Playwright Copy] Start copying production node_modules...`);
      console.log(`Source: ${srcNodeModules}`);
      console.log(`Target: ${destNodeModules}`);

      try {
        // 确保目标目录存在
        if (!fs.existsSync(destNodeModules)) {
          fs.mkdirSync(destNodeModules, { recursive: true });
        }

        /**
         * 优化的复制逻辑：只复制 package.json 中 'dependencies' 列出的顶级模块。
         */
        fs.cpSync(srcNodeModules, destNodeModules, {
          recursive: true,
          filter: (source) => {
            // 检查是否是符号链接，避免 ENOTDIR
            try {
              if (fs.lstatSync(source).isSymbolicLink()) {
                return false;
              }
            } catch (e) {
              return false;
            }

            // 如果是 node_modules 自身或其子目录，则允许复制
            if (source === srcNodeModules || !source.includes('node_modules')) {
              return true;
            }

            // 提取顶级模块名称 (e.g., 'node_modules/playwright' -> 'playwright')
            const relativePath = path.relative(srcNodeModules, source);
            const topLevelModule = relativePath.split(path.sep)[0];

            // 检查这个顶级模块是否在生产依赖列表中
            if (productionDependencies.includes(topLevelModule)) {
              return true;
            }

            // 忽略其他所有模块 (即 devDependencies)
            return false;
          }
        });

        console.log('[Playwright Copy] node_modules (production only) copied successfully!');
      } catch (e: any) {
        console.error('[Playwright Copy] Failed to copy node_modules:', e.message);
        // 如果失败，通常是权限或路径问题，但至少会尝试复制
      }
    },
  },
};

const reactDistPath = path.resolve(__dirname, './dist/renderer');
if (!fs.existsSync(reactDistPath)) {
  console.warn('\n⚠️ Warning: React build directory not found at', reactDistPath);
}

export default config;