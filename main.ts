import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { YouTube } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';

import { getConfig } from "./config.ts";
import { videosInDirectories } from "./fs.ts";
import { getStore, saveStore, Store } from './store.ts';
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

  const configChannelIds = config.urls.map(urlToChannelId);

  const channelUrls = configChannelIds.length < 1
    ? Object.keys(store.playlists)
    : configChannelIds;

  if (channelUrls.length < 1) {
    console.error('ERR: no channel urls provided to sync');
    Deno.exit(1);
  }

  if (config.dir) addPathToChannelIds(store, configChannelIds, config.dir);

  const directories = Object.values(store.playlists).map(playlist => { return playlist.path; });
  const videosPaths = await videosInDirectories(directories);

  const yt = new YouTube(config.apiKey, false);
  const uploadedVideos = await getAllChannelsUploads(yt, configChannelIds);

  const { different: differentVideos } = groupVideos(uploadedVideos, videosPaths);

  console.info('INF: videos to fetch:');
  for (const video of differentVideos) {
    addVideo(store, {
      channelId: video.channelId,
      id: video.id,
      title: video.title,
    });

    console.info(`INF: ${video.title} [${video.id}]`);
  }

  if (config.dryRun) {
    console.info('INF: due to dry-run flag, no changes were saved to the filesystem or the store');
    Deno.exit(0);
  }

  const archives = archivesToUpdate(store, differentVideos);
  await downloadVideos([...archives.values()]);
  saveStore(config.storeDir, store);
}

function addPathToChannelIds(store: Store, channelIds: string[], path: string) {
  for (const channelId of channelIds) {
    const playlist = store.playlists[channelId];

    if (playlist) {
      playlist.path = path;

      continue;
    } 

    store.playlists[channelId] = {
      id: channelId,
      path: path,
    };
  }
}

function addVideo(store: Store, video: video) {
  store.videos[video.id] = {
    channelId: video.channelId,
    id: video.id,
    title: video.title,
  };
}

function archivesToUpdate(store: Store, videos: Set<video>): Map<string, archive> {
  const archives = new Map<string, archive>();

  for (const video of videos) {
    const dirPath = store.playlists[video.channelId].path;
    const directory = archives.get(dirPath);
    if (directory) {
      directory.videoIds.push(video.id);

      continue;
    } 

    archives.set(dirPath, {
      path: dirPath,
      videoIds: [video.id]
    });
  }

  return archives;
}

function groupVideos(uploadedVideos: Set<video>, videosPaths: Set<string>): ({
  existing: Set<video>,
  different: Set<video>,
}) {
  const existing = new Set<video>();
  const different = new Set<video>();

  for (const video of uploadedVideos) {
    videosPaths.has(`${video.title}-${video.id}`)
      ? existing.add(video)
      : different.add(video);
  }

  return {
    existing: existing,
    different: different,
  };
}

function urlToChannelId(url: string): string {
  const pathname = new URL(url).pathname;

  return parse(pathname).name;
}

await main();