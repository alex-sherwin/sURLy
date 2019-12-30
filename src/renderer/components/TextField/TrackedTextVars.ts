// third party
import { IRange } from "monaco-editor";

// local
import { TextVar } from "../../../shared/models/TextVar";

export interface TrackedTextVars {
  [keyof: string]: { textVar: TextVar; range: IRange } | undefined;
}
