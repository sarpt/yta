import { join } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { exists } from 'https://deno.land/std@0.92.0/fs/mod.ts';
import { parse, Args } from "https://deno.land/std@0.92.0/flags/mod.ts";

const userHome = 'HOME';
const parentDir = '.config';
const filename = 'yta.json';
const dataDirName = '.yta';

enum ArgNames {
  ApiKey = 'api-key',
  Dir = 'dir',
  Download = 'download',
  DryRun = 'dry-run',
  StoreDir = 'store',
  SyncLocal = 'sync-local',
  UseCwd = 'use-cwd',
  YoutbeDlPath = 'yt-dl',
}

enum EnvNames {
  ApiKey = 'YTA_API_KEY',
  YoutubeDlPath = 'YTA_YOUTUBE_DL'
}

interface Arguments extends Args {
  apiKey?: string, 
  dir?: string,
  download?: boolean,
  dryRun?: boolean,
  storeDir?: string,
  syncLocal?: boolean,
  useCwd?: boolean,
  youtubeDlPath?: string,
}

type Config = {
  apiKey?: string,
  dir?: string,
  download: boolean,
  dryRun: boolean,
  storeDir: string,
  syncLocal: boolean,
  youtubeDlPath?: string,
  urls: string[],
}

let config: Config | undefined = undefined;
const path = join(parentDir, filename);

function getFilePath(): string | undefined {
  const homePath = Deno.env.get(userHome);
  if (!homePath) { return; }

  return join(homePath, path);
}

function getDataPath(): string | undefined {
  const homePath = Deno.env.get(userHome);
  if (!homePath) { return; }

  return join(homePath, dataDirName);
}

export async function getConfig(): Promise<Config> {
  if (config) return config;

  config = await createConfig();
  
  return config;
} 

async function createConfig(): Promise<Config> {
  const file = await readFile();
  const env = readEnv();
  const args = readArguments();
  const newConfig = {
    apiKey: args.apiKey ?? env.apiKey ?? file.apiKey,
    dir: args.dir,
    download: args.download ?? true,
    dryRun: args.dryRun ?? false,
    storeDir: args.storeDir ?? getDataPath() ?? Deno.cwd(),
    syncLocal: args.syncLocal ?? true,
    youtubeDlPath: args.youtubeDlPath ?? env.youtubeDlPath ?? file.youtubeDlPath,
    urls: args.urls ?? [],
  };

  if (!newConfig.dir && args.useCwd) newConfig.dir = Deno.cwd();

  return newConfig;
}

async function readFile() {
  const path = getFilePath();
  if (!path) { return {}; }

  const fileExists = await exists(path);
  if (!fileExists) { return {}; }

  const content = await Deno.readTextFile(path);
  const jsonContent = JSON.parse(content);

  return jsonContent;
}

function readArguments() {
  const args: Arguments = parse(Deno.args);

  const urls = args._ as string[];

  return {
    apiKey: args[ArgNames.ApiKey],
    dir: args[ArgNames.Dir],
    download: args[ArgNames.Download],
    dryRun: args[ArgNames.DryRun],
    storeDir: args[ArgNames.StoreDir],
    syncLocal: args[ArgNames.SyncLocal],
    useCwd: args[ArgNames.UseCwd],
    youtubeDlPath: args[ArgNames.YoutbeDlPath],
    urls, 
  };
}

function readEnv() {
  return {
    apiKey: Deno.env.get(EnvNames.ApiKey),
    youtubeDlPath: Deno.env.get(EnvNames.YoutubeDlPath),
  };
}
