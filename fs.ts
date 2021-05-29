import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { walk } from 'https://deno.land/std@0.92.0/fs/mod.ts';

import { getIdFromFilename } from "./ytdl.ts";

export async function videoIdsInDirectory(dirs: Iterable<string>): Promise<Set<string>> {
  const titles = new Set<string>();

  for (const dir of dirs) {
    for await (const entry of walk(dir)) {
      if (entry.isDirectory) continue;

      const id = getIdFromFilename(parse(entry.path).name);
      if (!id) continue;

      titles.add(id);
    }
  }

  return titles;
}
