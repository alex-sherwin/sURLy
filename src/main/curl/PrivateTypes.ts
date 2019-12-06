// local
import { createFlatPromise, FlatPromise } from "../../shared/FlatPromise";

// really local
import { ExecuteResult, ExecuteOptions, Info } from "./PublicTypes";

export interface RequestParts {
  flatPromise: FlatPromise<ExecuteResult>;
  options: ExecuteOptions;
  receivedHeaders: string[];
  infos: Info[];
  start?: number;
  end?: number;
  httpVersion?: string;
  entityBytesReceived: number;
  entityContentType?: string;
  entityEncoding: "identity" | "gzip" | "compress" | "deflate" | "br" | string;
}

export interface RequestStreamState {
  buf: Buffer | null;
  offset: number;
  bufBytesRead: number;
  libcurlPaused: boolean;
  done: boolean;
  error?: Error;
}
