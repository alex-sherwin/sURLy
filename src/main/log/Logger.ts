// third party
import { createLogger, format, transports } from "winston";
const { combine, printf } = format;

// local

const levelEnhancer = format((info, opts) => {
  return {
    ...info,
    // 7 is not aribtrary, it's N where N is the string length of the longest logging level name "verbose"
    level: `${info.level.toUpperCase().padStart(7, " ")}`,
  };
});

const consoleFormat = printf((info) => {
  if (info.taskId) {
    return `${info.timestamp} - ${info.level} - ${info.taskId} - ${info.message}`;
  }
  return `${info.timestamp} - ${info.level} - ${info.message}`;
});

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "debug";

const wlogger = createLogger({

  level: logLevel,

  exitOnError: true, // global exception handler

  transports: [
    new transports.Console({
      format: combine(levelEnhancer(), format.timestamp(), format.colorize(), consoleFormat),
    }),
  ],
});

export const log = wlogger;
