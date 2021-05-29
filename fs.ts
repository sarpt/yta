import { parse } from "https://deno.land/std@0.92.0/path/mod.ts";
import { getIdFromFilename } from "./ytdl.ts";

export async function videoIdsInDirectory(dirs: Iterable<string>): Promise<Set<string>> {
  const ids = new Set<string>();

  for (const dir of dirs) {
    for await (const entry of Deno.readDir(dir)) { // ReadDir used for not descending recursevily into directories TODO: add --recursive
      if (!entry.isFile) continue;

      const id = getIdFromFilename(parse(entry.name).name);
      if (!id) continue;

      ids.add(id);
    }
  }

  return ids;
}
