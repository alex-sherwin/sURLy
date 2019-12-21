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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F, function() {});
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow, function() {
      console.log("HERE!");

      editor!.setPosition({
        lineNumber: 1,
        column: 2
      });
      
      // cursorWordPartLeft
      // editor!.executeCommand("", {
      //   computeCursorState: (model, helper) => {
      //     editor
      //   },
      //   getEditOperations: (model, builder) => {

      //   },
      // });
    });
  };

  return (
    <MonacoEditor
      height="16px"
      defaultValue={"woohoo"}
      editorDidMount={onDidMount}
      onChange={onChange}
      options={{
        lineHeight: 16,
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
        fontFamily: "Hack",
        fontSize: 16,
        tabCompletion: "off",
        useTabStops: false,
      }}

    />
  );
};
