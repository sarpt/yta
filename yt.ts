import { YouTube } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';

type channelItem = {
  contentDetails: {
    relatedPlaylists: {
      uploads: string
    }
  }
};

type channelsListResponse = {
  items: channelItem[],
};

type playlistItem = {
  snippet: {
    title: string,
    description: string,
    channelId: string,
  },
  contentDetails: {
    videoId: string,
  }
};

type playlistItemsListResponse = {
  nextPageToken: string,
  prevPageToken: string,
  pageInfo: {
    totalResults: number,
    resultsPerPage: number,
  },
  items: playlistItem[],
};

export type video = {
  channelId: string,
  id: string,
  title: string,
};

export async function getAllChannelsUploads(yt: YouTube, channelIds: string[]): Promise<Set<video>> {
  const uploadsPlaylistIds = await getChannelUploadsIds(yt, channelIds);

  return await getPlaylistsAllVideos(yt, uploadsPlaylistIds);
}

async function getChannelUploadsIds(yt: YouTube, channelIds: string[]): Promise<string[]> {
  const channelsRes: channelsListResponse = await yt.channels_list({
    part: "snippet,contentDetails",
    id: channelIds.join(','),
  });

  return channelsRes.items.map(channel => {
    return channel.contentDetails.relatedPlaylists.uploads;
  });
}

async function getPlaylistsAllVideos(yt: YouTube, playlistIds: string[]): Promise<Set<video>> {
  let itemsFetched = 0;
  let allItemsCount = 0;
  const fetchedVideos = new Set<video>();
  let nextPageToken: string | undefined; 

  do {
    const playlistsRes: playlistItemsListResponse = await yt.playlistItems_list({
      part: "snippet,contentDetails",
      maxResults: 50,
      playlistId: playlistIds.join(','),
      pageToken: nextPageToken ?? '',
    });

    playlistsRes.items.forEach(video => {
      fetchedVideos.add({
        channelId: video.snippet.channelId,
        id: video.contentDetails.videoId,
        title: video.snippet.title,
      });
    });

    itemsFetched += playlistsRes.pageInfo.resultsPerPage;
    allItemsCount = playlistsRes.pageInfo.totalResults;
    nextPageToken = playlistsRes.nextPageToken;
  } while (itemsFetched < allItemsCount);

  return fetchedVideos;
}
