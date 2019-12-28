// third party
import React, { FC, useState, useRef } from "react";
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import monacoEditor from "monaco-editor";
import { styled } from '../../theme';

export interface OneLineTextFieldProps {

}

interface Var {
  lineNumber: number;
  start: number;
  end: number;
  display: string;
  selected: boolean;
}

const NEWLINE_REGEX = /[\r\n]/g;

export const OneLineTextField: FC<OneLineTextFieldProps> = (props) => {

  const editorValue = useRef<string>("http://{hostname}.com:{port}/http/some-thing/_herewego?value=abc%20123");
  const [editor, setEditor] = useState<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const lastKeyCode = useRef<string | null>(null);

  const vars = useRef<Var[]>([
    { lineNumber: 1, start: 7, end: 17, display: "{hostname}", selected: false },
    { lineNumber: 1, start: 22, end: 28, display: "{port}", selected: false },
  ]);

  const onChange = (value: string, event: monacoEditor.editor.IModelContentChangedEvent) => {
    if (NEWLINE_REGEX.test(value)) {
      const sanitized = value.replace(NEWLINE_REGEX, "");
      editorValue.current = sanitized;
      editor!.setValue(sanitized);
    } else {
      editorValue.current = value;
    }
  };

  const onDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    setEditor(editor);

    monaco.editor.defineTheme("custom", Custom);
    monaco.editor.setTheme("custom");

    const applyEditorDecorations = () => {

      const nextDecorations: monacoEditor.editor.IModelDeltaDecoration[] = vars.current.map((it) => ({
        range: { startLineNumber: it.lineNumber, endLineNumber: it.lineNumber, startColumn: it.start + 1, endColumn: it.end + 1 },
        options: {
          className: it.selected ? "myDecoration selected" : "myDecoration",
          inlineClassName: it.selected ? "myInlineDecoration selected" : "myInlineDecoration",
          inlineClassNameAffectsLetterSpacing: true,
          isWholeLine: false,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        }
      }));

      editor.deltaDecorations([], nextDecorations);

    };

    setImmediate(applyEditorDecorations);

    editor.onDidChangeModelContent((e) => {
      console.log("onDidChangeModelContent", e);
      applyEditorDecorations();
    });

    editor.onKeyDown((e) => {
      const code = e.code;
      // console.log("onKeyDown code=" + code);
      lastKeyCode.current = code;
    });

    editor.onDidChangeCursorPosition((e) => {

      const position = e.position.column - 1; // modify to 0-based index
      const lineNumber = e.position.lineNumber;

      for (const v of vars.current) {

        if (position > v.start && position < v.end) {

          if (lastKeyCode.current === "ArrowLeft") {
            // move to left side
            editor.setPosition({
              lineNumber,
              column: v.start + 1, // modify to 1-based index
            })
          } else if (lastKeyCode.current === "ArrowRight") {
            // move to right side
            editor.setPosition({
              lineNumber,
              column: v.end + 1, // modify to 1-based index
            })
          } else {
            // figure out left or right based on how close it is
            editor.setPosition({
              lineNumber,
              column: 17,
            })
          }

        }

      }

    });

    editor.onDidChangeCursorSelection((e) => {
      console.log(`onDidChangeCursorSelection(reason=${e.reason}, source=${e.source})`)
      if (hasSelection(e.selection)) {
        const selectedValue = editorValue.current.substring(Math.min(e.selection.startColumn, e.selection.endColumn) - 1, Math.max(e.selection.startColumn, e.selection.endColumn) - 1);
        console.log(`** selection [${selectedValue}]`);
      } else {
        console.log(`-- no selection`);
      }
    });

    // editor.onDidChangeCursorSelection((e) => {

    //   if (!hasSelection(e.selection)) {
    //     return;
    //   }


    //   if (e.selection.startColumn >= 8 && e.selection.endColumn < 17) {

    //     const currentSelection = editor.getSelection()!;
    //     if (!hasSelection(currentSelection)) {
    //       return;
    //     }

    //     if (e.selection.endColumn < 17) {
    //       console.log(">> extending selection right");
    //       editor.setSelection({
    //         startLineNumber: currentSelection.startLineNumber,
    //         endLineNumber: currentSelection.endLineNumber,
    //         startColumn: currentSelection.startColumn,
    //         endColumn: 17,
    //       });
    //     } else if (e.selection.startColumn >= 8) {
    //       console.log("<< extending selection left");
    //       editor.setSelection({
    //         startLineNumber: currentSelection.startLineNumber,
    //         endLineNumber: currentSelection.endLineNumber,
    //         startColumn: 8,
    //         endColumn: currentSelection.endColumn,
    //       });
    //     }

    //   }

    // });


    // disable find
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F, function () { });

    // disable select line
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L, function () { });

    // disable enter
    editor.addCommand(monaco.KeyCode.Enter, function () { });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () { });

    // disable command pallette
    editor.addCommand(monaco.KeyCode.F1, function () { });

  };

  return (
    <StyledMonacoEditor
      height="30px"
      defaultValue={editorValue.current}
      editorDidMount={onDidMount}
      onChange={onChange}
      language="plaintext"
      options={{
        roundedSelection: false,
        lineHeight: 28,
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: "off",
        renderIndentGuides: false,
        renderLineHighlight: "none",
        lineDecorationsWidth: 0,
        glyphMargin: false,
        codeLens: false,
        autoSurround: "never",
        contextmenu: false,
        copyWithSyntaxHighlighting: false,
        // cursorStyle: "block",
        cursorStyle: "line",
        links: false,
        folding: false,
        scrollbar: {
          horizontal: "hidden",
          vertical: "hidden",
          verticalScrollbarSize: 0,
          horizontalScrollbarSize: 0,
        },
        matchBrackets: "near",
        wordWrap: "off",
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        quickSuggestions: false,
        fontFamily: "Source Code Pro",
        fontSize: 20,
        fontWeight: "300",
        tabCompletion: "off",
        useTabStops: false,
        selectionHighlight: true,
        occurrencesHighlight: true,
        // find: {

        // }
      }}

    />
  );
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


interface WrappedMonagoEditorProps extends MonacoEditorProps {
  className?: string;
}

const WrappedMonacoEditor: FC<WrappedMonagoEditorProps> = (props) => {
  const { className, options, ...rest } = props;
  return (
    <MonacoEditor
      {...rest}
      options={{
        ...options,
        extraEditorClassName: className,
      }}
    />
  );
};


const BG_COLOR = "#222224";


const StyledMonacoEditor = styled(WrappedMonacoEditor)`
  .myDecoration {
    border-top: solid 1px #e7ed18;
    border-bottom: solid 1px #e7ed18;
    z-index: 1;
    background-color: #3a3b1e;
  }

  .myInlineDecoration {
    /* width: 20px; */
    /* font-size: 16px; */
    /* background-color: pink; */
    position: relative;
    z-index: 2;
    color: #e7ed18;
  }
`;

export const Custom: monacoEditor.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: undefined!, background: BG_COLOR, foreground: "#0aff4b" },
  ],
  colors: {
    "editorGutter.background": BG_COLOR,

    "editor.background": BG_COLOR,
    "editor.foreground": "#0aff4b",

    "editorCursor.background": BG_COLOR,
    "editorCursor.foreground": "#0aff4b",

    "editor.selectionBackground": "#216131",
    "editor.selectionHighlightBackground": "#193620",
    "editor.selectionForeground": "#000000",

    "background": BG_COLOR,
    "foreground": "#ff0000",
  }
};
