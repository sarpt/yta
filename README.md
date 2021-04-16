# YouTube Archive (yta)

Simple wrapper over `youtube-dl` that syncs directory contents to current state of the channel - replacement/enhancement of archive files implemented by `youtube-dl` (not really brining anything new to the table yet...).

Pretty much a tinkering project to learn/understand `deno`, always in a "not-really-working" state.

### execution example
```deno run --unstable --allow-net=www.googleapis.com --allow-env --allow-read main.ts --dir="/path/to/dir" https://www.youtube.com/channel/<id>```

### dependencies for running

- `deno` - tested on 1.8 and up
- `youtube-dl` - used for downloading unarchived videos
- YouTube Data API v3 key - for fetching channels and playlists data from YouTube API. Can be generated in a google cloud developers console.

### permissions

- `allow-env` - for reading environment variables which overwrite config file options
- `allow-read` - for reading directories for downloaded videos and reading `$HOME/.config/yta.json` file with configuration
- `allow-run` - for executing `youtube-dl` to download videos 

### arguments

- `dir` - string - (defualt: current working directory) directory to fetch unarchived videos into
- `api-key` - string - YouTube DATA API v3 key required for fetching information about channels and playlists
- `yt-dl` - string - (defualt: `youtube-dl`) path/name to the `youtube-dl` executable

### environment variables

- `YTA_API_KEY` - YouTube Data API v3
- `YTA_YOUTUBE_DL` - name/path to the `youtube-dl` executable

### config

The config file should reside in `$HOME/.config/yta.json`.

- `apiKey` - YouTube Data API v3
- `youtubeDlPath` - name/path to the `youtube-dl` executable
