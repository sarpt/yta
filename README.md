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
- `allow-write` - for saving `$HOME/.config/yta.json` file with configuration
- `allow-run` - for executing `youtube-dl` to download videos 

### arguments

- `api-key` - string - YouTube DATA API v3 key required for fetching information about channels and playlists
- `dir` - string - (defualt: current working directory) directory to fetch unarchived videos into
- `download` - boolean - (default: `true`) download videos missing from store/disk. Can be additionally negated with `--no-download`
- `dry-run` - boolean - (default: `false`) run program but dont save changes to the disk: don't save store information, don't save video files in the directories
- `sync-local` - boolean - (default: `true`) check specified directories (either from `dir` or from store) for videos not being present in the store, or check store for saved videos not being present on the disk. Can be additionally negated with `--no-sync-local`
- `yt-dl` - string - (defualt: `youtube-dl`) path/name to the `youtube-dl` executable

### unnamed arguments

Unnamed arguments are treated as URLs for youtube channels for which the video information should be fetched.

### environment variables

- `YTA_API_KEY` - YouTube Data API v3
- `YTA_YOUTUBE_DL` - name/path to the `youtube-dl` executable

### config

The config file should reside in `$HOME/.config/yta.json`.

- `apiKey` - YouTube Data API v3
- `youtubeDlPath` - name/path to the `youtube-dl` executable
