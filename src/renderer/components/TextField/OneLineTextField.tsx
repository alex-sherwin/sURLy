// third party
import React, { FC, useRef } from "react";
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

const NEWLINE_REGEX = /[\r\n]/g;

const EMPTY_VARS: Var[] = [];

export const OneLineTextField: FC<OneLineTextFieldProps> = (props) => {

  const editorValue = useRef<string>("http://{hostname}.com:{port}/http/some-thing/_herewego?value=abc%20123");
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monacoEditor | null>(null);
  const lastKeyCode = useRef<string | null>(null);
  const varTracking = useRef<VarTracking>({});
  const varEditsPending = useRef<boolean>(false);

  const vars = useRef<Var[]>([
    { lineNumber: 1, start: 7, end: 17, display: "{hostname}", selected: false },
    { lineNumber: 1, start: 22, end: 28, display: "{port}", selected: false },
  ]);


  const applyEditorDecorations = () => {

    if (!editorRef.current) {
      return;
    }

    const nextDecorations: monacoEditor.editor.IModelDeltaDecoration[] = vars.current.map((it) => ({
      range: { startLineNumber: it.lineNumber, endLineNumber: it.lineNumber, startColumn: it.start + 1, endColumn: it.end + 1 },
      options: {
        className: it.selected ? "myDecoration selected" : "myDecoration",
        inlineClassName: it.selected ? "myInlineDecoration selected" : "myInlineDecoration",
        inlineClassNameAffectsLetterSpacing: true,
        isWholeLine: false,
        stickiness: monacoRef.current!.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        hoverMessage: { value: "# wut", isTrusted: true },
      },
    } as monacoEditor.editor.IModelDeltaDecoration));

    const result = editorRef.current.deltaDecorations(Object.keys(varTracking.current), nextDecorations);
    // const result = editorRef.current.deltaDecorations([], nextDecorations);
    const tracking: VarTracking = {};

    for (let i = 0; i < result.length; i++) {
      const id = result[i];
      tracking[id] = vars.current[i];
    }

    varTracking.current = tracking;
  };

  const onDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    monacoRef.current = monaco;
    editorRef.current = editor;

    monaco.editor.defineTheme("custom", Custom);
    monaco.editor.setTheme("custom");

    setImmediate(applyEditorDecorations);

    editor.onDidChangeModelContent((e) => {
      // console.log("onDidChangeModelContent", e);
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
            });
          } else if (lastKeyCode.current === "ArrowRight") {
            // move to right side
            editor.setPosition({
              lineNumber,
              column: v.end + 1, // modify to 1-based index
            });
          } else {
            // figure out left or right based on how close it is to the center

            const totalWidth = v.end - v.start;
            const center = Math.floor(totalWidth / 2);
            const offset = position - v.start;
            const column = offset >= center ? v.end + 1 : v.start + 1; // modify to 1-based index

            editor.setPosition({
              lineNumber,
              column,
            });
          }

        }

      }

    });

    editor.onDidChangeCursorSelection((e) => {
      // console.log(`onDidChangeCursorSelection(reason=${e.reason}, source=${e.source})`)
      if (hasSelection(e.selection)) {
        const selectedValue = editorValue.current.substring(Math.min(e.selection.startColumn, e.selection.endColumn) - 1, Math.max(e.selection.startColumn, e.selection.endColumn) - 1);
        // console.log(`** selection [${selectedValue}]`);
      } else {
        // console.log(`-- no selection`);
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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_G, function () { });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_G, function () { });

    // disable goto line
    editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KEY_G, function () { });

    // disable select line
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L, function () { });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_L, function () { });

    // disable enter (only during text editor focus)
    editor.addCommand(monaco.KeyCode.Enter, function (e: any) { }, 'editorTextFocus && !suggestWidgetVisible');
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () { });

    // disable command pallette
    editor.addCommand(monaco.KeyCode.F1, function () { });



    editor.onDidChangeModelDecorations(e => {

      if (varEditsPending.current) {
        return;
      }
      try {
        varEditsPending.current = true;

        console.log(">> start onDidChangeModelDecorations");



        const currentDecorations = editor.getLineDecorations(1);

        if (currentDecorations) {

          const toDeletes: { v: Var, decoration: monacoEditor.editor.IModelDecoration }[] = [];
          let hasModifications = false;

          for (const currentDecoration of currentDecorations) {
            // console.log("varTracking.current", JSON.stringify(varTracking.current));
            const v = varTracking.current[currentDecoration.id];
            if (!v) {
              continue;
            }
            const oldSize = v.end - v.start;
            const newSize = currentDecoration.range.endColumn - currentDecoration.range.startColumn;

            if (oldSize != newSize) {
              // size changed, user wants to delete the var
              console.log(`deleting id=${currentDecoration.id}`);
              toDeletes.push({ v, decoration: currentDecoration });
            } else {
              // check if moved, track changes
              if (v.lineNumber !== currentDecoration.range.startLineNumber) {
                // console.log("updated line number");
                v.lineNumber = currentDecoration.range.startLineNumber;
              }
              if (v.start !== currentDecoration.range.startColumn - 1) {
                // console.log("updated start col");
                v.start = currentDecoration.range.startColumn - 1; // convert to 0-based indexing
              }
              if (v.end !== currentDecoration.range.endColumn - 1) {
                // console.log("updated end col");
                v.end = currentDecoration.range.endColumn - 1; // convert to 0-based indexing
              }
            }
          }


          // let inFluxEditorValue = editor.getValue();

          const edits: monacoEditor.editor.IIdentifiedSingleEditOperation[] = [];

          if (toDeletes.length > 0) {

            hasModifications = true;

            const varsCopy = [...vars.current];

            // delete from right-to-left so that editor text indexes can be processed without affecting one another
            const sortedToDeletes = _sortBy(toDeletes, it => it.decoration.range.startColumn).reverse();

            for (const toDelete of sortedToDeletes) {
              const { v, decoration } = toDelete;

              // splice out the var
              const idx = varsCopy.indexOf(v);
              if (idx !== -1) {
                varsCopy.splice(idx, 1);
              }

              // modify the text model to remove the remainder of the var

              // text before decoration
              // const valueBefore = inFluxEditorValue.substring(0, decoration.range.startColumn - 1); // 0-based indexing

              // // text after decoration
              // const valueAfter = inFluxEditorValue.substring(decoration.range.endColumn - 1); // 0-based indexing

              edits.push({
                text: null,
                range: new Range(decoration.range.startLineNumber, decoration.range.startColumn, decoration.range.endLineNumber, decoration.range.endColumn),
              });

              // setImmediate(() => {
              //   editor.executeEdits(
              //     "my-source",
              //     [{
              //       text: null,
              //       range: new Range(decoration.range.startLineNumber, decoration.range.startColumn, decoration.range.endLineNumber, decoration.range.endColumn),
              //     }],
              //     (ops) => {
              //       console.log("ops", ops);
              //       return [new Selection(1, 1, 1, 2)];
              //     }
              //   );
              // });


              // inFluxEditorValue = valueBefore + valueAfter;

            }

            vars.current = varsCopy;
          }

          if (hasModifications) {
            // editor.setValue(inFluxEditorValue);
            setImmediate(() => {
              editor.executeEdits(
                "my-source", edits,
                (ops) => {
                  // const nextSelections:Selection[] = 
                  return ops.map(it => new Selection(it.range.startLineNumber, it.range.startColumn, it.range.endLineNumber, it.range.endColumn));
                }
              );
              applyEditorDecorations();
              varEditsPending.current = false;
            });

          } else {
            varEditsPending.current = false;

          }

        }

        // // track changes to vars via model decoration changes
        // const currentDecorations = editor!.getLineDecorations(1);

        console.log("<< end onDidChangeModelDecorations");
      } finally {
      }

    });

  };

  const onChange = (value: string, event: monacoEditor.editor.IModelContentChangedEvent) => {
    // console.log("onChange");

    // const decorations = editor!.getLineDecorations(1);
    // console.log("decorations", decorations);

    // let sanitized = NEWLINE_REGEX.test(value) ? value.replace(NEWLINE_REGEX, "") : value;
    // let workingVersion = applyEditsToValue(editorValue.current, value, event.changes);
    // // strip newline & carriage returns
    // workingVersion = NEWLINE_REGEX.test(value) ? value.replace(NEWLINE_REGEX, "") : workingVersion;

    // editorValue.current = workingVersion;

    // if (editor!.getValue() !== workingVersion) {
    //   editor!.setValue(workingVersion);
    // }


  };

  const applyEditsToValue = (prevValue: string, nextValue: string, changes: monacoEditor.editor.IModelContentChange[]): string => {

    let currentValue = nextValue;

    // apply changes left-to-right (vars are ordered)
    const sortedChanges = _sortBy(_sortBy(_sortBy(changes, it => it.range.endColumn), it => it.range.startColumn), it => it.range.startLineNumber);
    // console.log("changes", changes);
    // console.log("sortedChanges", sortedChanges);

    for (const change of sortedChanges) {

    }

    return currentValue;
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
