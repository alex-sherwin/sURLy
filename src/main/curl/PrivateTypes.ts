// local
import { FlatPromise } from "../../shared/FlatPromise";

// really local
import { ExecuteResult, ExecuteOptions, Info, ExecuteTiming } from "./PublicTypes";

export interface RequestParts {
  flatPromise: FlatPromise<ExecuteResult>;
  options: ExecuteOptions;
  receivedHeaders: string[];
  infos: Info[];
  timing: Partial<ExecuteTiming>;
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
