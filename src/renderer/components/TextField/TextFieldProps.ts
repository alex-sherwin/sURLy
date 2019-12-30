
// local
import { TextExpression } from "../../../shared/models/TextExpression";

export interface TextFieldProps {
  initialValue: TextExpression;
  onChange?: (value: TextExpression) => void;
}
