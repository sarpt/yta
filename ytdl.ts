import { StringReader } from 'https://deno.land/std@0.92.0/io/mod.ts';

const filenameSeparator = '-';

export type archive = {
  path: string,
  videoIds: string[],
};

export async function downloadVideos(archives: archive[]) {
  for (const archive of archives) {
    const p = Deno.run({
      cmd: ['youtube-dl', '--ignore-errors', '--batch-file', '-'],
      cwd: archive.path,
      stdin: 'piped',
    });

    const data = new StringReader(archive.videoIds.join('\n')).bytes();
    await p.stdin.write(data);
    p.stdin.close();

    await p.status();
    p.close();
  }
}

export function getIdFromFilename(name: string): string | undefined {
  if (!name.includes(filenameSeparator)) return;

  const fileNameParts = name.split(filenameSeparator);
  return fileNameParts[fileNameParts.length - 1];
} 

export function createFilename(title: string, id: string): string {
  return `${title}${filenameSeparator}${id}`;
}
