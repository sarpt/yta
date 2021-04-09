import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { walk } from 'https://deno.land/std@0.92.0/fs/mod.ts';

export async function videosInDirectories(dirs: string[]): Promise<Set<string>> {
  const titles = new Set<string>();

  for (const dir of dirs) {
    console.log(`checking directory ${dir}`);

    for await (const entry of walk(dir)) {
      if (entry.isDirectory) continue;

      titles.add(parse(entry.path).name);
    }
  }

  return titles;
}
