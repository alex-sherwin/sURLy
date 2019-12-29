// third party
import React, { FC, useRef, useEffect } from "react";
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import monacoEditor, { Range, Selection } from "monaco-editor";
import _sortBy from "lodash/sortBy";
import _groupBy from "lodash/groupBy";

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

interface TrackedVar {
  var: Var;
  decorationId: string;
}

interface UndoRedoAction {
  altVersion: number;
  enter: () => void;
  exit: () => void;
}

const varToDecoration = (it: Var): monacoEditor.editor.IModelDeltaDecoration => ({
  range: { startLineNumber: it.lineNumber, endLineNumber: it.lineNumber, startColumn: it.start, endColumn: it.end },
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
  const editorVersion = useRef<number>(NaN);
  const editorAltVersion = useRef<number>(NaN);
  const monacoRef = useRef<typeof monacoEditor | null>(null);
  const lastKeyCode = useRef<string | null>(null);
  const trackedVars = useRef<TrackedVar[]>([]);
  const undoRedoActions = useRef<UndoRedoAction[]>([]);
  const vars = useRef<Var[]>([
    { lineNumber: 1, start: 8, end: 18, display: "{hostname}", selected: false },
    { lineNumber: 1, start: 23, end: 29, display: "{port}", selected: false },
  ]);

  useEffect(() => {
    setImmediate(applyEditorDecorations);
    editorVersion.current = editorRef.current!.getModel()!.getVersionId();
    editorAltVersion.current = editorRef.current!.getModel()!.getAlternativeVersionId();
  }, [editorRef.current]);

  const applyEditorDecorations = () => {

    if (!editorRef.current) {
      return;
    }

    const nextDecorations: monacoEditor.editor.IModelDeltaDecoration[] = vars.current.map(varToDecoration);

    const lastDecorationIds = trackedVars.current.map(it => it.decorationId);
    const result = editorRef.current.deltaDecorations(lastDecorationIds, nextDecorations);
    console.log(`last decoration ids [${lastDecorationIds}] new [${result}]`);

    const nextTrackedVars: TrackedVar[] = vars.current
      .map((it, idx) => ({ var: it, decorationId: result[idx] }));

    trackedVars.current = nextTrackedVars;
  };

  const deleteVarsAndApplyDecorations = (toDeleteVars: TrackedVar[]) => {
    console.log(`deleteTrackedVars count=${toDeleteVars.length}`);
    for (const toDeleteVar of toDeleteVars) {
      if (vars.current.includes(toDeleteVar.var)) {
        vars.current.splice(vars.current.indexOf(toDeleteVar.var), 1);
      }
    }
    applyEditorDecorations();
  };

  const onKeyDown = (e: monacoEditor.IKeyboardEvent) => {
    const code = e.code;
    // console.log("onKeyDown code=" + code);
    lastKeyCode.current = code;
  };

  const onDidChangeModelContent = (e: monacoEditor.editor.IModelContentChangedEvent) => {

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextVersionId = e.versionId;
    const nextAltVersionId = editor.getModel()!.getAlternativeVersionId();

    console.log(`\n\nonDidChangeModelContent v=${nextVersionId} alt_v=${nextAltVersionId}`);

    if (!e.isRedoing && !e.isUndoing) {
      // not undo/redo action, we need to check if we need to delete any vars
      const liveDecorations = editor.getModel()!.getAllDecorations();
      const [varsToDelete, rangesToDelete] = findVarsToDelete(liveDecorations, trackedVars.current);
      updateVarPositions(liveDecorations, trackedVars.current);

      if (varsToDelete.length > 0) {
        // does not bump editor model version
        deleteVarsAndApplyDecorations(varsToDelete);
      }

      if (rangesToDelete.length > 0) {
        // issue edit operations to delete remainder of the text representing the deleted vars

        const edits: monacoEditor.editor.IIdentifiedSingleEditOperation[] = [];

        for (const rangeToDelete of rangesToDelete) {
          edits.push({
            text: null,
            // range: new Range(rangeToDelete.startLineNumber, rangeToDelete.startColumn, rangeToDelete.endLineNumber, rangeToDelete.endColumn),
            range: rangeToDelete,
          });
          console.log(`queued up delete @ v=${editorVersion.current}`);
        }

        setImmediate(() => {
          editor.executeEdits(
            "delete-vars",
            edits,
            (ops) => ops.map(it => new Selection(it.range.startLineNumber, it.range.startColumn, it.range.endLineNumber, it.range.endColumn))
          );
        });

      }
    }

    editorVersion.current = nextVersionId;
    editorAltVersion.current = nextAltVersionId;
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

const findVarsToDelete = (liveDecorations: monacoEditor.editor.IModelDecoration[], currentTrackedVars: TrackedVar[]): [TrackedVar[], Range[]] => {
  const liveDecorationsById = _groupBy(liveDecorations, it => it.id);
  const varsToDelete: TrackedVar[] = [...currentTrackedVars];
  const ranges: Range[] = [];

  for (const currentTrackedVar of currentTrackedVars) {
    const decoration: monacoEditor.editor.IModelDecoration | undefined = liveDecorationsById[currentTrackedVar.decorationId][0];
    if (!shouldVarBeDeleted(decoration, currentTrackedVar)) {
      if (varsToDelete.includes(currentTrackedVar)) {
        varsToDelete.splice(varsToDelete.indexOf(currentTrackedVar), 1);
      }
    } else {
      ranges.push(decoration.range);
    }
  }

  return [varsToDelete, ranges];
};

const shouldVarBeDeleted = (liveDecoration: monacoEditor.editor.IModelDecoration | undefined, trackedVar: TrackedVar): boolean => {
  if (!liveDecoration) {
    return true;
  }
  const decorationSize = liveDecoration.range.endColumn - liveDecoration.range.startColumn;
  const varSize = trackedVar.var.end - trackedVar.var.start;
  if (decorationSize !== varSize) {
    return true;
  }
  return false;
};

const updateVarPositions = (liveDecorations: monacoEditor.editor.IModelDecoration[], currentTrackedVars: TrackedVar[]): void => {
  const liveDecorationsById = _groupBy(liveDecorations, it => it.id);

  for (const currentTrackedVar of currentTrackedVars) {
    const decoration: monacoEditor.editor.IModelDecoration | undefined = liveDecorationsById[currentTrackedVar.decorationId][0];
    if (shouldVarBeMoved(decoration, currentTrackedVar)) {
      currentTrackedVar.var.start = decoration.range.startColumn;
      currentTrackedVar.var.end = decoration.range.endColumn;
    }
  }
};

const shouldVarBeMoved = (liveDecoration: monacoEditor.editor.IModelDecoration | undefined, trackedVar: TrackedVar): boolean => {
  if (!liveDecoration) {
    return false;
  }
  const decorationSize = liveDecoration.range.endColumn - liveDecoration.range.startColumn;
  const varSize = trackedVar.var.end - trackedVar.var.start;
  if (decorationSize === varSize) {
    if (liveDecoration.range.startColumn !== trackedVar.var.start) {
      return true;
    }
  }
  return false;
};