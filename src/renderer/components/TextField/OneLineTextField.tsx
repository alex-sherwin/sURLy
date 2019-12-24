// third party
import React, { FC, useState } from "react";
import MonacoEditor from 'react-monaco-editor';
import monacoEditor from "monaco-editor";

export interface OneLineTextFieldProps {

}

const SINGLE_LINE_BLACKLIST_REGEX = /[\r\n\t]/g;
const EMPTY_STRING = "";

export const OneLineTextField: FC<OneLineTextFieldProps> = (props) => {

  const [editor, setEditor] = useState<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  const onChange = (value: string, event: monacoEditor.editor.IModelContentChangedEvent) => {
    const sanitized = value.replace(SINGLE_LINE_BLACKLIST_REGEX, EMPTY_STRING);
    if (editor!.getValue() !== sanitized) {
      editor!.setValue(sanitized);
    }
  };

  const onDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    setEditor(editor);

    // disable find
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F, function () { });

    // poor mans cursorWordPartLeft behavior (vscode behavior for subword cursor navigation)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow, () => {

      const position = editor?.getPosition();
      if (editor && position) {
        const relevantValue = editor.getModel()?.getValueInRange({
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
          startColumn: 0,
        });

        if (relevantValue) {

          const nextIndex = getNextLeftWordPartIndex(0, relevantValue);

          editor.setPosition({
            lineNumber: position.lineNumber,
            column: nextIndex
          });
        }
      }

    });

    // poor mans cursorWordPartRight behavior (vscode behavior for subword cursor navigation)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.RightArrow, () => {

      const position = editor?.getPosition();
      if (editor && position) {
        const relevantValue = editor.getModel()?.getValueInRange({
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          endColumn: Number.MAX_SAFE_INTEGER,
          startColumn: position.column,
        });

        if (relevantValue) {
          const nextIndex = getNextRightWordPartIndex(position.column, relevantValue);

          editor.setPosition({
            lineNumber: position.lineNumber,
            column: nextIndex
          });
        }
      }

    });

    // poor mans cursorWordPartLeft + shift (selection) behavior (vscode behavior for subword cursor navigation)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow, () => {

      const position = editor?.getPosition();

      if (editor && position) {
        const relevantValue = editor.getModel()?.getValueInRange({
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
          startColumn: 0,
        });

        if (relevantValue) {

          const nextIndex = getNextLeftWordPartIndex(0, relevantValue);

          const currentSelection = editor.getSelection();

          editor.setPosition({
            lineNumber: position.lineNumber,
            column: nextIndex
          });

          if (hasSelection(currentSelection)) {

            // add or remove from selection?

            if (currentSelection!.positionColumn === currentSelection!.startColumn) {
              // add to selection (using IRange)
              editor.setSelection({
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: Math.max(currentSelection!.endColumn, currentSelection!.startColumn),
                endColumn: nextIndex,
              });
            } else {
              console.log("removing..")
              // remove from selection (using ISelection)
              editor.setSelection({
                selectionStartLineNumber: position.lineNumber,
                positionLineNumber: position.lineNumber,
                selectionStartColumn: currentSelection!.startColumn,
                positionColumn: nextIndex,
              });
            }

          } else {
            // no existing, start a new selection (using IRange)
            editor.setSelection({
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: nextIndex,
            });
          }

        }
      }

    });


    // poor mans cursorWordPartRight + shift (selection) behavior (vscode behavior for subword cursor navigation)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.RightArrow, () => {

      const position = editor?.getPosition();

      if (editor && position) {
        const relevantValue = editor.getModel()?.getValueInRange({
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          endColumn: Number.MAX_SAFE_INTEGER,
          startColumn: position.column,
        });

        if (relevantValue) {

          const nextIndex = getNextRightWordPartIndex(position.column, relevantValue);

          const currentSelection = editor.getSelection();

          editor.setPosition({
            lineNumber: position.lineNumber,
            column: nextIndex
          });

          if (hasSelection(currentSelection)) {

            // add or remove from selection?

            if (currentSelection!.positionColumn === currentSelection!.endColumn) {
              // add to selection (using IRange)
              editor.setSelection({
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: Math.min(currentSelection!.endColumn, currentSelection!.startColumn),
                endColumn: nextIndex,
              });
            } else {
              // remove from selection (using ISelection)
              editor.setSelection({
                selectionStartLineNumber: position.lineNumber,
                positionLineNumber: position.lineNumber,
                selectionStartColumn: currentSelection!.endColumn,
                positionColumn: nextIndex,
              });
            }

          } else {
            // no existing, start a new selection (using IRange)
            editor.setSelection({
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: nextIndex,
            });
          }

        }
      }

    });

  };

  return (
    <MonacoEditor
      height="24px"
      defaultValue="http://localhost.com:8080/some-thing/_herewego?value=abc%20123"
      editorDidMount={onDidMount}
      onChange={onChange}
      options={{
        lineHeight: 24,
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: "off",
        renderIndentGuides: false,
        renderLineHighlight: "none",
        lineDecorationsWidth: "0",
        glyphMargin: false,
        codeLens: false,
        autoSurround: "never",
        contextmenu: false,
        copyWithSyntaxHighlighting: false,
        cursorStyle: "block",
        find: undefined,
        folding: false,
        scrollbar: {
          horizontal: "hidden",
          vertical: "hidden",
          verticalScrollbarSize: 0,
          horizontalScrollbarSize: 0,
        },
        matchBrackets: false,
        wordWrap: "off",
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        quickSuggestions: false,
        fontFamily: "Roboto Mono",
        fontSize: 18,
        fontWeight: "300",
        tabCompletion: "off",
        useTabStops: false,
      }}

    />
  );
};

const ALPHANUM_WORD_PARTS = /[a-z0-9]/i;

type WordMode = "none" | "alphanum" | "special";

interface WordPart {
  _type: "alphanum" | "special";
  value: string;
  start: number;
  end: number;
}

const splitOnWordParts = (str: string): WordPart[] => {

  const parts: WordPart[] = [];

  // let currentPart: string = "";
  let currentPartStart = 0;
  let mode: WordMode = "none";

  for (let i = 0; i < str.length; i++) {

    const char = str[i];

    if (ALPHANUM_WORD_PARTS.test(char)) {
      // regular char
      if (mode === "none") {
        // start regular word part
        mode = "alphanum";
        currentPartStart = i;
      } else if (mode === "alphanum") {
        // continue regular word part (do nothing)
      } else if (mode === "special") {
        // finish special word part, start a new regular word part
        parts.push({
          _type: "special",
          value: str.substring(currentPartStart, i),
          start: currentPartStart,
          end: i,
        });
        mode = "alphanum";
        currentPartStart = i;
      }
    } else {
      // special char
      if (mode === "none") {
        // start special word part
        mode = "special";
        currentPartStart = i;
      } else if (mode === "special") {
        // continue special word part (do nothing)
      } else if (mode === "alphanum") {
        // finish regular word part, start a new special word part
        parts.push({
          _type: "alphanum",
          value: str.substring(currentPartStart, i),
          start: currentPartStart,
          end: i,
        });
        mode = "special";
        currentPartStart = i;
      }
    }

  }

  // last part
  if (mode === "alphanum") {
    parts.push({
      _type: "alphanum",
      value: str.substring(currentPartStart, str.length),
      start: currentPartStart,
      end: str.length,
    });
  } else if (mode === "special") {
    parts.push({
      _type: "special",
      value: str.substring(currentPartStart, str.length),
      start: currentPartStart,
      end: str.length,
    });
  }

  return parts;
};

const getNextLeftWordPartIndex = (offset: number, str: string): number => {
  const parts = splitOnWordParts(str);
  const nextPart = parts[parts.length - 1];
  return offset + (nextPart.start) + 1;
};

const getNextRightWordPartIndex = (offset: number, str: string): number => {
  const parts = splitOnWordParts(str);
  let nextPart = parts[0];
  if (nextPart.end - nextPart.start === 1) {
    // only 1 char, advance to next if possible
    if (parts.length > 1) {
      nextPart = parts[1];
    }
  }
  return offset + nextPart.end - 1;
};

const hasSelection = (selection: monacoEditor.Selection | null): boolean => {
  if (selection) {
    if (selection.startLineNumber !== selection.endLineNumber) {
      return true; // spans rows
    }
    if (selection.startColumn !== selection.endColumn) {
      return true; // spans columns
    }
  }
  return false;
};
