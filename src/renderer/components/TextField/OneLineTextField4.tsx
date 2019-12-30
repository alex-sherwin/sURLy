// third party
import React, { FC, useRef, useEffect, useState } from "react";
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import monacoEditor, { Range, Selection, editor } from "monaco-editor";
import _sortBy from "lodash/sortBy";
import _groupBy from "lodash/groupBy";
import _cloneDeep from "lodash/cloneDeep";
import _flatten from "lodash/flatten";

// local
import { TextExpression } from "../../../shared/models/TextExpression";
import { TextVar } from "../../../shared/models/TextVar";
import { styled } from '../../theme';
import { disableOneLineEditorFunctionality } from './utils';

export interface OneLineTextFieldProps {
  value: TextExpression;
  onChange?: (value: TextExpression) => void;
}

export interface OneLineTextFieldReadyEvent {

}

interface TrackedTextVars {
  [keyof: string]: { textVar: TextVar; range: monacoEditor.IRange } | undefined;
}

export const OneLineTextField4: FC<OneLineTextFieldProps> = (props) => {

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monacoEditor | null>(null);
  const editorVersion = useRef<number>(NaN);
  const editorAltVersion = useRef<number>(NaN);

  const [textExpression, setTextExpression] = useState<TextExpression>(props.value);
  const lastDecorationIds = useRef<string[]>([]);
  const trackedTextVars = useRef<TrackedTextVars>({});

  useEffect(() => {
    // setImmediate(applyEditorDecorations);
    editorVersion.current = editorRef.current!.getModel()!.getVersionId();
    editorAltVersion.current = editorRef.current!.getModel()!.getAlternativeVersionId();
  }, [editorRef.current]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    applyDecorations(editorRef.current);
  }, [textExpression]);

  const applyDecorations = (editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    log(`** applyDecorations **`);
    const decorations = textExpressionToEditorDecorations(textExpression);
    const nextDecorationIds = editor.deltaDecorations(lastDecorationIds.current, decorations);
    lastDecorationIds.current = nextDecorationIds;
    trackedTextVars.current = trackTextVars(nextDecorationIds, decorations, textExpression.vars);
  };

  const updateTextExpressionAfterModelChanges = (nextValue: string) => {

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextDecorations = editorRef.current!.getModel()!.getAllDecorations();

    // we need to see which decorations moved and which ones need to be deleted

    const nextTextExpression: TextExpression = {
      raw: nextValue,
      vars: [],
    };

    let hasChanges = false;

    const edits: monacoEditor.editor.IIdentifiedSingleEditOperation[] = [];

    for (const nextDecoration of nextDecorations) {

      const currentDisplayedDecorationValue = editorRef.current?.getModel()?.getValueInRange(nextDecoration.range);
      const existingTrackedVar = trackedTextVars.current[nextDecoration.id];

      if (existingTrackedVar) {
        const { textVar: existingTextVar, range: existingRange } = existingTrackedVar;

        if (currentDisplayedDecorationValue === existingTextVar.display) {
          // display value unmodified, it either moved or stayed in the same spot
          if (!nextDecoration.range.equalsRange(existingRange)) {
            // moved!
            nextTextExpression.vars.push({
              ...existingTrackedVar.textVar,
              lineNumber: nextDecoration.range.startLineNumber - 1,
              startIndex: nextDecoration.range.startColumn - 1,
              endIndex: nextDecoration.range.endColumn - 1,
            });
            hasChanges = true;
          } else {
            // same spot, track as-is
            nextTextExpression.vars.push(existingTrackedVar.textVar);
          }
        } else {
          hasChanges = true;
          // changed display value... stop tracking the var, push an edit operation to delete the remaining range

          log(`--- MUST DELETE VAR ---`);

          edits.push({
            text: null,
            range: nextDecoration.range,
          });

        }

      }
    }

    if (hasChanges) {
      log(`>> updated text expression!`);
      if (edits.length > 0) {
        setImmediate(() => {
          setTextExpression(nextTextExpression);
          editor.executeEdits(
            "delete-var-range",
            edits,
            (ops) => ops.map(it => new Selection(it.range.startLineNumber, it.range.startColumn, it.range.endLineNumber, it.range.endColumn))
            // (ops) => []
          );
        });
      } else {
        setTextExpression(nextTextExpression);
      }
    }

  };

  const onDidChangeModelContent = (e: monacoEditor.editor.IModelContentChangedEvent) => {

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextVersionId = e.versionId;
    const nextAltVersionId = editor.getModel()!.getAlternativeVersionId();
    const nextValue = editor.getValue();

    log(`onDidChangeModelContent editorVer=${editorVersion.current} editorAltVer=${editorAltVersion.current} / nextVer=${nextVersionId} nextAltVer=${nextAltVersionId}`);
    log(`onDidChangeModelContent value [${nextValue}]`);

    // 1. update text expression
    updateTextExpressionAfterModelChanges(nextValue);

    // [last]: write decorations
    // applyDecorations(editor);
    // const decorations = textExpressionToEditorDecorations(textExpression.current);
    // log(`writing ${decorations.length} decorations`);
    // console.log("decorations", decorations);
    // const nextDecorationIds = editor.deltaDecorations(lastDecorationIds.current, decorations);
    // lastDecorationIds.current = nextDecorationIds;


    editorVersion.current = nextVersionId;
    editorAltVersion.current = nextAltVersionId;
  };


  const onDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    monacoRef.current = monaco;
    editorRef.current = editor;

    monaco.editor.defineTheme("custom", Custom);
    monaco.editor.setTheme("custom");

    // event listeners
    editor.onDidChangeModelContent(onDidChangeModelContent);

    disableOneLineEditorFunctionality(editor, monaco);
  };

  return (
    <StyledMonacoEditor
      height="30px"
      defaultValue={props.value.raw}
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






const textExpressionToEditorDecorations = (expr: TextExpression): monacoEditor.editor.IModelDeltaDecoration[] =>
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

const trackTextVars = (decorationIds: string[], decorations: monacoEditor.editor.IModelDeltaDecoration[], textVars: TextVar[]): TrackedTextVars => {
  const tracking: TrackedTextVars = {};
  for (let i = 0; i < decorationIds.length; i++) {
    tracking[decorationIds[i]] = {
      textVar: textVars[i],
      range: { ...decorations[i].range },
    };
  };
  return tracking;
};

const log = (msg: string) => {
  console.log(`${new Date().toISOString()} - ${msg}`);
};
