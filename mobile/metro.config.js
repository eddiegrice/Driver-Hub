const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// `react-native-render-html` sets "react-native": "src/". With Expo's resolverMainFields
// (react-native → browser → main), Metro loads TS source but fails to resolve
// extensionless `./RenderHTML` → `RenderHTML.tsx` under node_modules. Force the
// prebuilt CommonJS entry instead.
const renderHtmlCommonJs = path.join(
  projectRoot,
  'node_modules',
  'react-native-render-html',
  'lib',
  'commonjs',
  'index.js'
);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-render-html') {
    return { filePath: renderHtmlCommonJs, type: 'sourceFile' };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
