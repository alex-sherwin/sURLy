// third party
import monacoEditor from "monaco-editor";
import _flatten from "lodash/flatten";

// local
import { TextExpression } from '../../../shared/models/TextExpression';
import { TextVar } from '../../../shared/models/TextVar';

// really local
import { TrackedTextVars } from './TrackedTextVars';

export const disableOneLineEditorFunctionality = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor): void => {

  // disable find
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F, function () { });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_G, function () { });
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_G, function () { });

  // disable goto line
  editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KEY_G, function () { });

  // disable select line
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L, function () { });
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L, function () { });

  // disable delete line
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K, function () { });

  // disable delete line remainder
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Delete, function () { });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backspace, function () { });

  // disable delete word
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Delete, function () { });
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Backspace, function () { });

  // disable enter (only during text editor focus)
  editor.addCommand(monaco.KeyCode.Enter, function (e: any) { }, 'editorTextFocus && !suggestWidgetVisible');
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () { });

  // disable command pallette
  editor.addCommand(monaco.KeyCode.F1, function () { });

};
export const trackTextVars = (decorationIds: string[], decorations: monacoEditor.editor.IModelDeltaDecoration[], textVars: TextVar[]): TrackedTextVars => {
  const tracking: TrackedTextVars = {};
  for (let i = 0; i < decorationIds.length; i++) {
    tracking[decorationIds[i]] = {
      textVar: textVars[i],
      range: { ...decorations[i].range },
    };
  };
  return tracking;
};

export const textExpressionToEditorDecorations = (expr: TextExpression): monacoEditor.editor.IModelDeltaDecoration[] =>
  _flatten(expr.vars.map(textVarToEditorDecoration));

const textVarToEditorDecoration = (textVar: TextVar): monacoEditor.editor.IModelDeltaDecoration => ({
  range: textVarToEditorIRange(textVar),
  options: {
    className: "myDecoration",
    inlineClassName: "myInlineDecoration",
    inlineClassNameAffectsLetterSpacing: false,
    isWholeLine: false,
    stickiness: 1, // 1 = TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
    hoverMessage: textVarToHoverMessage(textVar),
  },
});

// TextVar uses 0-based indexing, editor types use 1-based indexing (whyyyy? 😭😭😭)
const textVarToEditorIRange = (textVar: TextVar): monacoEditor.IRange => ({
  startLineNumber: textVar.lineNumber + 1,
  endLineNumber: textVar.lineNumber + 1,
  startColumn: textVar.startIndex + 1,
  endColumn: textVar.endIndex + 1,
});

const textVarToHoverMessage = (textVar: TextVar): monacoEditor.IMarkdownString | monacoEditor.IMarkdownString[] | undefined => {
  if (textVar.markdowns && textVar.markdowns.length > 0) {
    if (textVar.markdowns.length === 1) {
      return textToEditorIMarkdownString(textVar.markdowns[0], true);
    } else {
      return textVar.markdowns.map(it => textToEditorIMarkdownString(it, true));
    }
  }
  return;
};

const textToEditorIMarkdownString = (value: string, isTrusted: boolean): monacoEditor.IMarkdownString => ({
  value,
  isTrusted,
});
