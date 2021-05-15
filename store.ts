import { join } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { exists } from 'https://deno.land/std@0.92.0/fs/mod.ts';

const filename = 'yta_store.json';

export type PlaylistEntry = {
  id: string,
  path: string,
};

export type Playlists = Record<string, PlaylistEntry>;

export type VideoEntry = {
  id: string,
  title: string,
  channelId: string,
};

export type Videos = Record<string, VideoEntry>;

export type Store = {
  videos: Videos,
  playlists: Playlists,
};

export async function getStore(dirPath: string): Promise<Store | undefined> {
  const filepath = join(dirPath, filename);
  if (!await exists(filepath)) return;

  const content = await Deno.readTextFile(filepath);
  const jsonContent: Store = JSON.parse(content);

  return jsonContent;
}

export async function saveStore(dirPath: string, store: Store) {
  const filepath = join(dirPath, filename);
  const jsonContent = JSON.stringify(store);

  await Deno.writeTextFile(filepath, jsonContent, { create: true });
}
