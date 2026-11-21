const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;
const legacy = path.resolve(__dirname, '../../_legacy');
const escaped = legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  new RegExp(`^${escaped}[/\\\\]`),
  /[/\\]\.venv[/\\]/,
];

module.exports = config;
