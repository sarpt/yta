import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { YouTube } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';
import { exists } from 'https://deno.land/std@0.92.0/fs/mod.ts';

import { getConfig } from "./config.ts";
import { videosInDirectories } from "./fs.ts";
import { getStore, saveStore, Store } from './store.ts';
import { getAllChannelsUploads, video } from "./yt.ts";
import { archive, createFilename, downloadVideos, getIdFromFilename } from "./ytdl.ts";

async function main() {
  const config = await getConfig();
  let store = await getStore(config.storeDir);
 
  if (!store) {
    console.warn('WARN: no store file detected');

    store = {
      videos: {},
      playlists: {},
    };
  } else {
    console.info(`INF: using store in path '${config.storeDir}'`);
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

  const { missingFromDiskPaths, missingFromStorePaths } = await checkStoreWithVideosOnDisk(store, videosPaths);

  const yt = new YouTube(config.apiKey, false);
  const uploadedVideos = await getAllChannelsUploads(yt, configChannelIds);

  if (config.syncLocal) syncLocalState(store, missingFromStorePaths, uploadedVideos);
  if (config.download) await downloadMissingVideos(store, missingFromDiskPaths, uploadedVideos, videosPaths);

  if (!config.dryRun) saveStore(config.storeDir, store);
}

function syncLocalState(store: Store, missingFromStorePaths: Set<string>, uploadedVideos: Map<string, video>) {
  const { matching: missingFromStoreVideos } = matchPathsToVideos(missingFromStorePaths, uploadedVideos);

  if (!missingFromStoreVideos.size) {
    console.info('INF: no local videos missing from store');

    return;
  }

  console.info('INF: videos on disk missing from store:');
  for (const video of missingFromStoreVideos.values()) {
    addVideo(store, {
      channelId: video.channelId,
      id: video.id,
      title: video.title,
    });

    console.info(`INF: ${video.title} [${video.id}]`);
  }
}

async function downloadMissingVideos(store: Store, missingFromDiskPaths: Set<string>, uploadedVideos: Map<string, video>, videosPaths: Set<string>) {
  const { matching: missingFromDiskVideos } = matchPathsToVideos(missingFromDiskPaths, uploadedVideos);
  const { different: differentVideos } = groupVideos(uploadedVideos, videosPaths);

  const videosToFetch = new Set<video>([
    ...differentVideos,
    ...missingFromDiskVideos.values()
  ]);

  console.info('INF: videos to fetch:');
  for (const video of videosToFetch) {
    addVideo(store, {
      channelId: video.channelId,
      id: video.id,
      title: video.title,
    });

    console.info(`INF: ${video.title} [${video.id}]`);
  }

  const archives = archivesToUpdate(store, videosToFetch);
  await downloadVideos([...archives.values()]);
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

async function checkStoreWithVideosOnDisk(store: Store, onDiskPaths: Set<string>): (Promise<{
  missingFromStorePaths: Set<string>,
  missingFromDiskPaths: Set<string>,
}>) {
  const missingFromDiskPaths = new Set<string>();

  for (const video of Object.values(store.videos)) {
    const path = store.playlists[video.channelId].path;
    const pathExists = await exists(path);
    if (pathExists) continue;

    missingFromDiskPaths.add(path);
  }

  const missingFromStorePaths = new Set<string>();

  for (const path of onDiskPaths) {
    const id = getIdFromFilename(path);
    if (!id || store.videos[id]) continue;

    missingFromStorePaths.add(path);
  }

  return {
    missingFromDiskPaths,
    missingFromStorePaths,
  };
}

function matchPathsToVideos(paths: Set<string>, allVideos: Map<string, video>): ({
  matching: Map<string, video>,
  missing: Set<string>,
}) {
  const matching = new Map<string, video>();
  const missing = new Set<string>();

  for (const path of paths) {
    const id = getIdFromFilename(path);
    if (!id) {
      missing.add(path);

      continue;
    }

    const video = allVideos.get(id);

    video ? matching.set(id, video) : missing.add(path);
  }

  return {
    matching,
    missing,
  };
}

function groupVideos(uploadedVideos: Map<string, video>, videosPaths: Set<string>): ({
  existing: Set<video>,
  different: Set<video>,
}) {
  const existing = new Set<video>();
  const different = new Set<video>();

  for (const [, video] of uploadedVideos) {
    videosPaths.has(createFilename(video.title, video.id))
      ? existing.add(video)
      : different.add(video);
  }

  return {
    existing,
    different,
  };
}

function urlToChannelId(url: string): string {
  const pathname = new URL(url).pathname;

  return parse(pathname).name;
}

await main();