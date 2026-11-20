import type { LocalFiles } from '@core/local-files';

export function memoryFiles() {
  const contents = new Map<string, string>();
  const directories = new Set<string>(['file://documents']);
  let failing = false;
  const check = () => { if (failing) throw new Error('Synthetic IO failure'); };
  const files: LocalFiles = {
    documentDirectory: () => 'file://documents/',
    exists: jest.fn(async path => { check(); return contents.has(path) || directories.has(path); }),
    read: jest.fn(async path => {
      check();
      const text = contents.get(path);
      if (text === undefined) throw new Error('Missing synthetic file');
      return text;
    }),
    write: jest.fn(async (path, text) => { check(); contents.set(path, text); }),
    mkdir: jest.fn(async path => { check(); directories.add(path);
      const parts = path.split('/');
      while (parts.length > 3) { parts.pop(); directories.add(parts.join('/')); } }),
    list: jest.fn(async path => {
      check();
      return [...contents.keys()].filter(name => name.startsWith(`${path}/`)).map(name => name.slice(path.length + 1)).filter(name => !name.includes('/'));
    }),
    remove: jest.fn(async path => {
      check(); directories.delete(path); contents.delete(path);
      for (const key of contents.keys()) if (key.startsWith(`${path}/`)) contents.delete(key);
      for (const key of directories) if (key.startsWith(`${path}/`)) directories.delete(key);
    }),
    size: jest.fn(async path => { check(); return contents.get(path)?.length ?? 0; }),
  };
  return { files, contents, directories, fail: () => { failing = true; } };
}
