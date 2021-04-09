export async function downloadVideos(videos: Set<string>, dir: string) {
  const p = Deno.run({
    cmd: ['youtube-dl', ...videos.values()],
    cwd: dir,
  });

  await p.status();
  p.close();
}
