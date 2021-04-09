import { join } from 'https://deno.land/std@0.92.0/path/mod.ts';
import { exists } from 'https://deno.land/std@0.92.0/fs/mod.ts';
import { parse, Args } from "https://deno.land/std@0.92.0/flags/mod.ts";

const userHome = 'HOME';
const parentDir = '.config';
const filename = 'yta.json';

enum ArgNames {
  ApiKey = 'api-key',
  Dir = 'dir',
  YoutbeDlPath = 'yt-dl',
}

enum EnvNames {
  ApiKey = 'YTA_API_KEY',
  YoutubeDlPath = 'YTA_YOUTUBE_DL'
}

interface Arguments extends Args {
  apiKey?: string, 
  dir?: string,
  youtubeDlPath?: string,
}

type Config = {
  apiKey?: string,
  dir?: string,
  youtubeDlPath?: string,
  urls: string[],
}

let config: Config | undefined = undefined;
const path = join(parentDir, filename);

function getConfigPath(): string | undefined {
  const homePath = Deno.env.get(userHome);
  if (!homePath) { return; }

  return join(homePath, path);
}

export async function getConfig(): Promise<Config> {
  if (config) return config;

  const file = await readFile();
  const env = readEnv();
  const args = readArguments();
  config = {
    apiKey: args.apiKey ?? env.apiKey ?? file.apiKey,
    dir: args.dir,
    youtubeDlPath: args.youtubeDlPath ?? env.youtubeDlPath ?? file.youtubeDlPath,
    urls: args.urls ?? [],
  };
  
  return config;
} 

async function readFile() {
  const path = getConfigPath();
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
