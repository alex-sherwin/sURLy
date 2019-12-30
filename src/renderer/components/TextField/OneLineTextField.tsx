// third party
import React, { FC, useRef, useEffect, useState } from "react";
import monacoEditor from "monaco-editor";
import _sortBy from "lodash/sortBy";
import _groupBy from "lodash/groupBy";
import _cloneDeep from "lodash/cloneDeep";
import _flatten from "lodash/flatten";

// local
import { TextExpression } from "../../../shared/models/TextExpression";
import { TextVar } from "../../../shared/models/TextVar";

// really local
import { ThemedMonacoEditor } from "./ThemedMonacoEditor";
import { TextFieldProps } from "./TextFieldProps";
import { TextFieldReadyEvent } from "./TextFieldReadyEvent";
import { TrackedTextVars } from "./TrackedTextVars";
import { disableOneLineEditorFunctionality, textExpressionToEditorDecorations, trackTextVars } from './utils';

export interface OneLineTextFieldProps extends TextFieldProps {

}

export const OneLineTextField: FC<OneLineTextFieldProps> = (props) => {

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monacoEditor | null>(null);
  const editorVersion = useRef<number>(NaN);
  const editorAltVersion = useRef<number>(NaN);

  const [textExpression, setTextExpression] = useState<TextExpression>(props.initialValue);
  const lastDecorationIds = useRef<string[]>([]);
  const trackedTextVars = useRef<TrackedTextVars>({});
  const previousTextVars = useRef<Map<number, TextVar[]>>(new Map());
  const varsPendingDelete = useRef<TextVar[]>([]);

  useEffect(() => {
    editorVersion.current = editorRef.current!.getModel()!.getVersionId();
    editorAltVersion.current = editorRef.current!.getModel()!.getAlternativeVersionId();
    previousTextVars.current.set(editorAltVersion.current, textExpression.vars);
  }, [editorRef.current]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const editor = editorRef.current;
    // log(`** applyDecorations **`);
    const decorations = textExpressionToEditorDecorations(textExpression);
    const nextDecorationIds = editor.deltaDecorations(lastDecorationIds.current, decorations);
    lastDecorationIds.current = nextDecorationIds;
    trackedTextVars.current = trackTextVars(nextDecorationIds, decorations, textExpression.vars);
  }, [textExpression]);

  const updateTextExpressionAfterModelChanges = (nextValue: string, nextEditorVersion: number) => {

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

    const edits: { op: monacoEditor.editor.IIdentifiedSingleEditOperation, textVar: TextVar }[] = [];

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

          if (!varsPendingDelete.current.includes(existingTrackedVar.textVar)) {

            hasChanges = true;
            // changed display value... stop tracking the var, push an edit operation to delete the remaining range

            edits.push({
              op: {
                text: null,
                range: nextDecoration.range,
              },
              textVar: existingTrackedVar.textVar,
            });

            varsPendingDelete.current.push(existingTrackedVar.textVar);
          }

        }

      }
    }

    savePreviousTextVars(nextEditorVersion, nextTextExpression.vars);

    if (hasChanges) {
      if (edits.length > 0) {
        setImmediate(() => {
          setTextExpression(nextTextExpression);
          editor.executeEdits(
            "delete-text-var-ranges",
            edits.map(it => it.op),
            // (ops) => ops.map(it => new Selection(it.range.startLineNumber, it.range.startColumn, it.range.endLineNumber, it.range.endColumn))
          );
          for (const edit of edits) {
            if (varsPendingDelete.current.includes(edit.textVar)) {
              varsPendingDelete.current.splice(varsPendingDelete.current.indexOf(edit.textVar), 1);
            }
          }
        });
      } else {
        setTextExpression(nextTextExpression);
      }
    }

  };

  const savePreviousTextVars = (version: number, textVars: TextVar[]) => {
    previousTextVars.current.set(version, textVars);
  };

  const applyPreviousTextVars = (version: number) => {
    for (let target = version; target >= 0; target--) {
      if (previousTextVars.current.has(target)) {
        setTextExpression({
          ...textExpression,
          vars: previousTextVars.current.get(target)!,
        });
        return;
      }
    }
    throw new Error(`failed to find a previous text vars for version=${version}`);
  };

  const onDidChangeModelContent = (e: monacoEditor.editor.IModelContentChangedEvent) => {

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextVersionId = e.versionId;
    const nextAltVersionId = editor.getModel()!.getAlternativeVersionId();
    const nextValue = editor.getValue();

    // log(`onDidChangeModelContent editorVer=${editorVersion.current} editorAltVer=${editorAltVersion.current} / nextVer=${nextVersionId} nextAltVer=${nextAltVersionId}`);
    // log(`onDidChangeModelContent value [${nextValue}]`);

    // if not undo/redo, maybe update the TextExpression
    if (!e.isRedoing && !e.isUndoing) {
      updateTextExpressionAfterModelChanges(nextValue, nextAltVersionId);
    } else if (e.isRedoing || e.isUndoing) {
      applyPreviousTextVars(nextAltVersionId);
    }

    editorVersion.current = nextVersionId;
    editorAltVersion.current = nextAltVersionId;
  };


  const onReady = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    monacoRef.current = monaco;
    editorRef.current = editor;


    // event listeners
    editor.onDidChangeModelContent(onDidChangeModelContent);

    disableOneLineEditorFunctionality(editor, monaco);
  };

  return (
    <ThemedMonacoEditor
      theme="dark"
      height="30px"
      defaultValue={props.initialValue.raw}
      onReady={onReady}
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
