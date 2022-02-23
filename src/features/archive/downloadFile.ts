import fetch from "node-fetch";
import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";

const streamPipeline = promisify(pipeline);

export const downloadFile = async (url: string, path: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error while downloading file: ${response.statusText}`);
  }
  await streamPipeline(response.body!, createWriteStream(path));
};
