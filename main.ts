import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { YouTube } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';

import { getConfig } from "./config.ts";
import { videosInDirectories } from "./fs.ts";
import { getStore, saveStore } from './store.ts';
import { getAllChannelsUploads, video } from "./yt.ts";
import { archive, downloadVideos } from "./ytdl.ts";

async function main() {
  const config = await getConfig();
  let store = await getStore(config.storeDir);
 
  if (!store) {
    console.warn('WARN: no store file detected');

    store = {
      videos: {},
      playlists: {},
    };
  }

  if (!config.apiKey) {
    console.error('ERR: YouTube Data API key not specified');
    Deno.exit(1);
  }

  const configChannelIds = config.urls.map(url => {
    const pathname = new URL(url).pathname;
    return parse(pathname).name;
  });

  const channelUrls = configChannelIds.length < 1
    ? Object.keys(store.playlists)
    : configChannelIds;

  if (channelUrls.length < 1) {
    console.error('ERR: no channel urls provided to sync');
    Deno.exit(1);
  }

  if (config.dir) {
    for (const channelId of configChannelIds) {
      const playlist = store.playlists[channelId];

      if (playlist) {
        playlist.path = config.dir;

        continue;
      } 

      store.playlists[channelId] = {
        id: channelId,
        path: config.dir,
      };
    }
  }

  const directories = Object.values(store.playlists).reduce((acc, playlist) => { return [...acc, playlist.path]; }, [] as string[])
  const savedVideos = await videosInDirectories(directories);

  const yt = new YouTube(config.apiKey, false);
  const uploadedVideos = await getAllChannelsUploads(yt, configChannelIds);

  const matchingVideos = new Set<video>();
  const differentVideos = new Set<video>();
  uploadedVideos.forEach(video => {
    savedVideos.has(`${video.title}-${video.id}`) ? matchingVideos.add(video) : differentVideos.add(video);
  });

  console.info('INF: videos to fetch:');
  for (const video of differentVideos) {
    store.videos[video.id] = {
      channelId: video.channelId,
      id: video.id,
      title: video.title,
    };

    console.info(`INF: ${video.title} [${video.id}]`);
  }

  if (config.dryRun) {
    console.info('INF: due to dry-run flag, no changes were saved to the filesystem or the store');
    Deno.exit(0);
  }

  const archivesToUpdate = new Map<string, archive>();
  for (const video of differentVideos) {
    const dirPath = store.playlists[video.channelId].path;
    const directory = archivesToUpdate.get(dirPath);
    if (directory) {
      directory.videoIds.push(video.id);

      continue;
    } 

    archivesToUpdate.set(dirPath, {
      path: dirPath,
      videoIds: [video.id]
    });
  }

  await downloadVideos([...archivesToUpdate.values()]);
  saveStore(config.storeDir, store);
}

await main();