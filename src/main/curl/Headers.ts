// third party
import _trimEnd from "lodash/trimEnd";

// really local
import { HttpHeaders } from "./PublicTypes";

export const bufToHeaderLines = (headers: Buffer): string[] => {
  const str = _trimEnd(headers.toString(), "\r\n");
  if (str.indexOf("\n") !== -1) {
    // multiple headers
    const rawSplit = str.split("\n");
    return rawSplit.map(it => _trimEnd(it, "\r\n")).filter(it => it.length > 0);
  }
  // single header
  return [str].filter(it => it.length > 0);
};

export const headerMapToStrings = (headers: HttpHeaders): string[] => {
  const strings: string[] = [];
  for (const headerName in headers) {
    const headerValue = headers[headerName];
    if (typeof headerValue === "string") {
      strings.push(`${headerName}: ${headerValue}`);
    } else {
      // array, push for each
      for (const currentHeaderValue of headerValue) {
        strings.push(`${headerName}: ${currentHeaderValue}`);
      }
    }
  }
  return strings;
};

const HTTP_VERSION_HEADER_REGEX = /http\/1\.([0-1])/i;

/**
 * Parses the response header strings
 * 
 * @param headerStrings Tuple of [HTTP_VERSION, HEADERS]
 */
export const parseResponseHeaders = (headerStrings: string[]): [string, HttpHeaders] => {
  const headers: HttpHeaders = {};
  let httpVersion = "";
  for (const headerString of headerStrings) {
    const splitterIndex = headerString.indexOf(":");

    if (splitterIndex === -1) {
      // probably the HTTP version + status code line
      const matches = HTTP_VERSION_HEADER_REGEX.exec(headerString);
      if (matches) {
        httpVersion = `1.${matches[1]}`;
      }

    } else {
      // regular header
      const name = headerString.substr(0, splitterIndex);
      const value = headerString.substr(splitterIndex + 1).trimLeft();
      if (typeof headers[name] === "undefined") {
        headers[name] = value;
      } else if (typeof headers[name] === "string") {
        // convert from string -> string[]
        headers[name] = [headers[name] as string, value];
      } else if (Array.isArray(headers[name])) {
        (headers[name] as string[]).push(value);
      }
    }
  }
  return [httpVersion, headers];
};
