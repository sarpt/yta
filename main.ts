import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { YouTube } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';

import { getConfig } from "./config.ts";
import { videosInDirectories } from "./fs.ts";
import { getAllChannelsUploads } from "./yt.ts";
import { downloadVideos } from "./ytdl.ts";

async function main() {
  const config = await getConfig();

  if (!config.apiKey) {
    console.error("error - YouTube Data API key not specified");
    Deno.exit(1);
  }

  const channelIds = config.urls.map(url => {
    const pathname = new URL(url).pathname;
    return parse(pathname).name;
  });

  const dir = config.dir ?? Deno.cwd();
  const savedVideos = await videosInDirectories([dir]);

  const yt = new YouTube(config.apiKey, false);
  const uploadedVideos = await getAllChannelsUploads(yt, channelIds);

  const matchingVideos = new Set<string>();
  const differentVideos = new Set<string>();
  uploadedVideos.forEach(video => {
    savedVideos.has(video) ? matchingVideos.add(video) : differentVideos.add(video);
  });

  const videosToFetch = new Set<string>();
  for (const video of differentVideos) {
    videosToFetch.add(video.split('-')[1]);
  }

  await downloadVideos(videosToFetch, dir);
}

await main();