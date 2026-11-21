import path from 'node:path';

const meta = (message) => ({ type: 'problem', schema: [], messages: { violation: message } });
const functionTypes = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration']);

function layer(filename) {
  const normalized = filename.replaceAll('\\', '/');
  if (normalized.includes('/app/')) return 'screens';
  return normalized.match(/\/src\/(core|ui|pattern|layouts|features|screens)\//)?.[1];
}

const relativeLayers = {
  meta: meta('Use a path alias when importing across layers.'),
  create(context) {
    return {
      ImportDeclaration(node) {
        if (!node.source.value.startsWith('.')) return;
        const from = layer(context.filename);
        const to = layer(path.resolve(path.dirname(context.filename), node.source.value));
        if (from && to && from !== to) context.report({ node, messageId: 'violation' });
      },
    };
  },
};

const noBarrels = {
  meta: meta('Import and export declarations directly; do not reexport modules.'),
  create(context) {
    return {
      ExportAllDeclaration(node) { context.report({ node, messageId: 'violation' }); },
      ExportNamedDeclaration(node) {
        if (node.source) context.report({ node, messageId: 'violation' });
      },
    };
  },
};

const noEffectWork = {
  meta: meta('Use queries, mutations or render-time derivation instead of data work in an effect.'),
  create(context) {
    const effects = new Set(['useEffect', 'useLayoutEffect']);
    const apiBindings = new Set();
    const source = context.sourceCode;
    function definition(name, at) {
      for (let scope = source.getScope(at); scope; scope = scope.upper) {
        const variable = scope.set.get(name);
        if (variable) {
          const def = variable.defs[0]?.node;
          return def?.type === 'VariableDeclarator' ? def.init : def;
        }
      }
      return undefined;
    }
    function forbidden(callback, at, seen = new Set(), nested = false) {
      if (!callback || seen.has(callback)) return false;
      seen.add(callback);
      if (callback.type === 'Identifier') {
        return forbidden(definition(callback.name, at), at, seen, nested);
      }
      if (callback.async || callback.type === 'AwaitExpression') return true;
      if (callback.type === 'CallExpression') {
        const callee = callback.callee;
        const name = callee.type === 'Identifier' ? callee.name : callee.property?.name;
        const owner = callee.type === 'MemberExpression' ? callee.object?.name : undefined;
        if (apiBindings.has(name) || apiBindings.has(owner)) return true;
        if (/^(fetch|load|save|refetch|mutate|mutateAsync)([A-Z_]|$)/.test(name ?? '')) return true;
        if (['api', 'axios', 'http', 'client', 'mutation', 'queryClient'].includes(owner)) return true;
        if (!nested && /^set[A-Z]/.test(name ?? '') && !['setTimeout', 'setInterval'].includes(name)) return true;
        if (callee.type === 'Identifier' && forbidden(definition(name, callback), callback, seen, nested)) return true;
      }
      for (const key of source.visitorKeys[callback.type] ?? []) {
        const values = Array.isArray(callback[key]) ? callback[key] : [callback[key]];
        for (const child of values) {
          if (!child || typeof child !== 'object') continue;
          const childNested = nested || functionTypes.has(child.type);
          if (forbidden(child, child, seen, childNested)) return true;
        }
      }
      return false;
    }
    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (node.source.value === 'react' && ['useEffect', 'useLayoutEffect'].includes(specifier.imported?.name)) effects.add(specifier.local.name);
          if (node.source.value.startsWith('@core/api/') || node.source.value === '@core/http-resource') apiBindings.add(specifier.local.name);
        }
      },
      CallExpression(node) {
        const name = node.callee.type === 'Identifier' ? node.callee.name : node.callee.property?.name;
        if (!effects.has(name)) return;
        let callback = node.arguments[0];
        if (callback?.type === 'Identifier') callback = definition(callback.name, node);
        if (callback?.async || forbidden(callback?.body ?? callback, node)) context.report({ node, messageId: 'violation' });
      },
    };
  },
};

export default {
  rules: { 'relative-layers': relativeLayers, 'no-barrels': noBarrels, 'no-effect-work': noEffectWork },
};
