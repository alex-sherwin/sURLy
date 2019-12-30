// local
import { TextVar } from "./TextVar";

export interface TextExpression {
  raw: string;
  vars: TextVar[];
}
