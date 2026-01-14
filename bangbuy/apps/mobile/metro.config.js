// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// 使用 expo/metro-config 的預設配置（包含 Expo Router 的標準設定）
const config = getDefaultConfig(projectRoot);

// 1. 擴展 watchFolders 到整個 Monorepo 根目錄
// 這確保 Metro 能監控到 packages/* 中的文件變化
config.watchFolders = [
  ...(config.watchFolders || []),
  workspaceRoot,
];

// 2. Let Metro know where to resolve packages and in what order
// 優先從 apps/mobile/node_modules 解析，然後是根目錄的 node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. 添加額外的 resolver 配置，確保能正確解析 workspace 包
// 支援 @bangbuy/core 和 @core 別名
config.resolver.extraNodeModules = {
  '@bangbuy/core': path.resolve(workspaceRoot, 'packages/core'),
  '@core': path.resolve(workspaceRoot, 'packages/core/src'),
};

module.exports = config;




