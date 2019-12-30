// third party
import React, { FC } from "react";
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import monacoEditor from "monaco-editor";

export interface WrappedMonagoEditorProps extends Omit<MonacoEditorProps, "theme" | "editorDidMount"> {
  className?: string;
  onReady?: (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => void;
  customTheme: monacoEditor.editor.IStandaloneThemeData;
}

export const WrappedMonacoEditor: FC<WrappedMonagoEditorProps> = (props) => {
  const { className, onReady, options, customTheme, ...rest } = props;


  const onDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {

    monaco.editor.defineTheme("custom", customTheme);
    monaco.editor.setTheme("custom");

    if (onReady) {
      onReady(editor, monaco);
    }

  };

  return (
    <MonacoEditor
      {...rest}
      editorDidMount={onDidMount}
      options={{
        ...options,
        extraEditorClassName: className,
      }}
    />
  );
};
