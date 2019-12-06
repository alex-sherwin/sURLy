// third party
import { Readable, Writable } from "stream";

export interface HttpHeaders {
  [keyof: string]: string | string[];
}

export interface ClientOptions {
  maxConnectionsPerHost?: number;
  maxConnections?: number;
}

export interface ExecuteOptions {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: HttpHeaders;
  /** Optional request entity */
  requestEntity?: Buffer | Readable;
  /**
   * If provided, the response entity will be streamed to it.
   *
   * `Writable.end()` will be called when the request finishes.
   */
  responseEntity?: Writable;
  /** must be at leat 1024, can't be over 2MB */
  sendBufferSize?: number;
  /** must be at least 1024, can't be over 512KB */
  receiveBufferSize?: number;
}

export interface Info {
  epoch: number;
  message: string;
}

export interface ExecuteTiming {

  startEpoch: number;
  startNano: number;
  endEpoch: number;
  endNano: number;

  // request parts
  firstRequestHeaderEpoch: number;
  firstRequestHeaderNano: number;
  lastRequestHeaderEpoch: number;
  lastRequestHeaderNano: number;
  startRequestEntityEpoch: number;
  startRequestEntityNano: number;
  endRequestEntityEpoch: number;
  endRequestEntityNano: number;

  // response parts
  firstResponseHeaderEpoch: number;
  firstResponseHeaderNano: number;
  lastResponseHeaderEpoch: number;
  lastResponseHeaderNano: number;
  startResponseEntityEpoch: number;
  startResponseEntityNano: number;
  endResponseEntityEpoch: number;
  endResponseEntityNano: number;

}

export interface ExecuteResult {
  status: number;
  headers: HttpHeaders;
  infos: Info[];
  httpVersion: string;
  entityBytesReceived: number;
  entityContentType?: string;
  entityEncoding: "identity" | "gzip" | "compress" | "deflate" | "br" | string;
  timing: ExecuteTiming;
}