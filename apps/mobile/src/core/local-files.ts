import * as FileSystem from 'expo-file-system/legacy';

export type LocalFiles = {
  documentDirectory: () => string;
  exists: (path: string) => Promise<boolean>;
  read: (path: string) => Promise<string>;
  write: (path: string, text: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  list: (path: string) => Promise<string[]>;
  remove: (path: string) => Promise<void>;
  size: (path: string) => Promise<number>;
};

export const deviceFiles: LocalFiles = {
  documentDirectory: () => {
    if (!FileSystem.documentDirectory) throw new Error('Armazenamento local indisponível.');
    return FileSystem.documentDirectory;
  },
  exists: async path => (await FileSystem.getInfoAsync(path)).exists,
  read: path => FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 }),
  write: (path, text) => FileSystem.writeAsStringAsync(path, text, { encoding: FileSystem.EncodingType.UTF8 }),
  mkdir: path => FileSystem.makeDirectoryAsync(path, { intermediates: true }),
  list: path => FileSystem.readDirectoryAsync(path),
  remove: path => FileSystem.deleteAsync(path, { idempotent: true }),
  size: async path => {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? info.size : 0;
  },
};
