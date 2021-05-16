import { parse } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { YouTube } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';
import { exists } from 'https://deno.land/std@0.92.0/fs/mod.ts';

import { getConfig } from "./config.ts";
import { videosOnDisk } from "./fs.ts";
import { getStore, saveStore, Store } from './store.ts';
import { getAllChannelsUploads, video } from "./yt.ts";
import { archive, downloadVideos } from "./ytdl.ts";

async function main() {
  const config = await getConfig();

  if (!config.apiKey) {
    console.error('ERR: YouTube Data API key not specified');
    Deno.exit(1);
  }

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
  const videosOnDiskFilenames = await videosOnDisk(directories);

  const { missingFromDiskIds, missingFromStoreIds } = await checkStoreWithVideosOnDisk(store, videosOnDiskFilenames);

  const yt = new YouTube(config.apiKey, false);
  const uploadedVideos = await getAllChannelsUploads(yt, configChannelIds);

  if (config.syncLocal) syncLocalState(store, missingFromStoreIds, uploadedVideos);
  if (config.download) {
    const videosToDownload = getMissingVideos(missingFromDiskIds, uploadedVideos, videosOnDiskFilenames);
    await downloadMissingVideos(store, videosToDownload);
  } 

  if (!config.dryRun) saveStore(config.storeDir, store);
}

function syncLocalState(store: Store, missingFromStorePaths: Set<string>, uploadedVideos: Map<string, video>) {
  const { matching: missingFromStoreVideos } = matchIdsToVidoes(missingFromStorePaths, uploadedVideos);

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

function getMissingVideos(missingFromDiskIds: Set<string>, uploadedVideos: Map<string, video>, videosOnDiskIds: Set<string>): Set<video> {
  const { matching: missingFromDiskVideos } = matchIdsToVidoes(missingFromDiskIds, uploadedVideos);
  const missingVideos = getMissingIds(uploadedVideos, videosOnDiskIds);

  return new Set<video>([
    ...missingVideos,
    ...missingFromDiskVideos.values()
  ]);
}

async function downloadMissingVideos(store: Store, videosToDownload: Set<video>) {
  const config = await getConfig();

  console.info('INF: videos to download:');
  for (const video of videosToDownload) {
    addVideo(store, {
      channelId: video.channelId,
      id: video.id,
      title: video.title,
    });

    console.info(`INF: ${video.title} [${video.id}]`);
  }

  if (config.dryRun) return;

  const archives = archivesToUpdate(store, videosToDownload);
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

async function checkStoreWithVideosOnDisk(store: Store, onDiskIds: Set<string>): (Promise<{
  missingFromStoreIds: Set<string>,
  missingFromDiskIds: Set<string>,
}>) {
  const missingFromDiskIds = new Set<string>();

  for (const video of Object.values(store.videos)) {
    const path = store.playlists[video.channelId].path;
    const pathExists = await exists(path);
    if (pathExists) continue;

    missingFromDiskIds.add(video.id);
  }

  const missingFromStoreIds = new Set<string>();

  for (const id of onDiskIds) {
    if (store.videos[id]) continue;

    missingFromStoreIds.add(id);
  }

  return {
    missingFromDiskIds,
    missingFromStoreIds,
  };
}

function matchIdsToVidoes(ids: Set<string>, videos: Map<string, video>): ({
  matching: Map<string, video>,
  missing: Set<string>,
}) {
  const matching = new Map<string, video>();
  const missing = new Set<string>();

  for (const id of ids) {
    const video = videos.get(id);

    video ? matching.set(id, video) : missing.add(id);
  }

  return {
    matching,
    missing,
  };
}

function getMissingIds(videos: Map<string, video>, ids: Set<string>): Set<video> {
  const missing = new Set<video>();

  for (const [, video] of videos) {
    if (ids.has(video.id)) continue;

    missing.add(video);
  }

  return missing;
}

function urlToChannelId(url: string): string {
  const pathname = new URL(url).pathname;

  return parse(pathname).name;
}

await main();