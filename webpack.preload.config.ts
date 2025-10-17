import path from 'path';
import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';


const preloadConfig = {
    mode: 'development',
    entry: './src/preload.ts',       // preload 脚本入口
    target: 'electron-preload',
    module: { rules },
    plugins,
    resolve: { extensions: ['.ts', '.js'] },
    output: {
        path: path.resolve(__dirname, '.webpack/main'),
        filename: 'preload.js',
    },
};

export default preloadConfig;