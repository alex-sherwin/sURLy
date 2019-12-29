// third party
import React, { FC, useRef, useEffect } from "react";
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import monacoEditor, { Range, Selection } from "monaco-editor";
import _sortBy from "lodash/sortBy";

// local
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

interface VarTracking {
  [keyof: string]: Var | undefined;
}

const varToDecoration = (it: Var): monacoEditor.editor.IModelDeltaDecoration => ({
  range: { startLineNumber: it.lineNumber, endLineNumber: it.lineNumber, startColumn: it.start + 1, endColumn: it.end + 1 },
  options: {
    className: it.selected ? "myDecoration selected" : "myDecoration",
    inlineClassName: it.selected ? "myInlineDecoration selected" : "myInlineDecoration",
    inlineClassNameAffectsLetterSpacing: true,
    isWholeLine: false,
    stickiness: 1, // 1 = TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
    hoverMessage: { value: "# wut", isTrusted: true },
  },
});

export const OneLineTextField2: FC<OneLineTextFieldProps> = (props) => {

  const editorValue = useRef<string>("http://{hostname}.com:{port}/http/some-thing/_herewego?value=abc%20123");
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monacoEditor | null>(null);
  const lastKeyCode = useRef<string | null>(null);
  const varTracking = useRef<VarTracking>({});

  const vars = useRef<Var[]>([
    { lineNumber: 1, start: 7, end: 17, display: "{hostname}", selected: false },
    { lineNumber: 1, start: 22, end: 28, display: "{port}", selected: false },
  ]);

  useEffect(() => { setImmediate(applyEditorDecorations) }, [editorRef.current]);

  const applyEditorDecorations = () => {

    if (!editorRef.current) {
      return;
    }

    const x = 2;

    const nextDecorations: monacoEditor.editor.IModelDeltaDecoration[] = vars.current.map(varToDecoration);

    const result = editorRef.current.deltaDecorations(Object.keys(varTracking.current), nextDecorations);
    // const result = editorRef.current.deltaDecorations([], nextDecorations);
    const tracking: VarTracking = {};

    for (let i = 0; i < result.length; i++) {
      const id = result[i];
      tracking[id] = vars.current[i];
    }

    varTracking.current = tracking;
  };

  const onDidChangeModelContent = (e: monacoEditor.editor.IModelContentChangedEvent) => {

  };

  const onKeyDown = (e: monacoEditor.IKeyboardEvent) => {
    const code = e.code;
    // console.log("onKeyDown code=" + code);
    lastKeyCode.current = code;
  };

  const onDidChangeCursorPosition = (e: monacoEditor.editor.ICursorPositionChangedEvent) => {

  };

  const onDidChangeCursorSelection = (e: monacoEditor.editor.ICursorSelectionChangedEvent) => {

  };

  const onDidChangeModelDecorations = (e: monacoEditor.editor.IModelDecorationsChangedEvent) => {

  };

  const onDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    monacoRef.current = monaco;
    editorRef.current = editor;

    monaco.editor.defineTheme("custom", Custom);
    monaco.editor.setTheme("custom");

    // event listeners
    editor.onDidChangeModelContent(onDidChangeModelContent);
    editor.onKeyDown(onKeyDown);
    editor.onDidChangeCursorPosition(onDidChangeCursorPosition);
    editor.onDidChangeCursorSelection(onDidChangeCursorSelection);
    editor.onDidChangeModelDecorations(onDidChangeModelDecorations);

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

    // disable enter (only during text editor focus)
    editor.addCommand(monaco.KeyCode.Enter, function (e: any) { }, 'editorTextFocus && !suggestWidgetVisible');
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () { });

    // disable command pallette
    editor.addCommand(monaco.KeyCode.F1, function () { });

  };

  return (
    <StyledMonacoEditor
      height="30px"
      defaultValue={editorValue.current}
      editorDidMount={onDidMount}
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
        fontSize: 18,
        fontWeight: "300",
        tabCompletion: "off",
        useTabStops: false,
        selectionHighlight: true,
        occurrencesHighlight: true,
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
    z-index: 1;
    /* border-top: solid 1px #e7ed18; */
    border-bottom: solid 1px #e7ed18;
    /* background-color: #3a3b1e; */
  }

  .myInlineDecoration {
    z-index: 2;
    position: relative;
    color: #e7ed18;
  }

  .view-lines span.mtk1 {
    text-shadow: 0 0 4px #239440, 0 0 6px #227d39, 0 0 8px #2e362e;
    filter: saturate(90%);
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
