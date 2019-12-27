// third party
import React, { FC, useState } from "react";
import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import monacoEditor from "monaco-editor";
import { styled } from '../../theme';

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

    monaco.editor.defineTheme("custom", Custom);
    monaco.editor.setTheme("custom");


    // setImmediate(() => {
    //   editor.deltaDecorations([], [
    //     {
    //       range: { startLineNumber: 1, endLineNumber: 1, startColumn: 8, endColumn: 17 },
    //       options: {
    //         className: "myDecoration",
    //         // inlineClassName: "myInlineDecoration",
    //         inlineClassNameAffectsLetterSpacing: true,
    //         isWholeLine: false,

    //       }
    //     }
    //   ]);
    // });

    // disable find
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_F, function () { });

    // disable enter
    editor.addCommand(monaco.KeyCode.Enter, function () { });
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () { });

    // disable command pallette
    editor.addCommand(monaco.KeyCode.F1, function () { });

  };

  return (
    <StyledMonacoEditor
      height="28px"
      defaultValue="http://localhost.com:8080/http/some-thing/_herewego?value=abc%20123"
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
        cursorStyle: "block",
        links: false,
        // cursorStyle: "line",
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

const StyledMonacoEditor = styled(WrappedMonacoEditor)`
  .myDecoration {
    background-color: pink;
  }

  .myInlineDecoration {
    /* width: 20px; */
    font-size: 16px;
    background-color: pink;
  }
`;

const BG_COLOR = "#222224";

// const CommonColors: monacoEditor.editor.IColors = {
//   // "editorLineNumber.foreground": theme.primaryColor,
//   "editorGutter.background": BG_COLOR,
// }

export const Custom: monacoEditor.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    {
      token: undefined!,
      background: BG_COLOR,
      foreground: "#0aff4b",
    },
    // { token: undefined!,  },
    // JSON
    // { token: "delimiter.bracket.json", foreground: theme.successColor.substr(1) }, // lop off #

    // YAML
    // { token: "operators.directivesEnd.yaml", foreground: "FF0000" },
    // { token: "string.yaml", foreground: "009900" },
    // { token: "number.float", foreground: "990000" },
    // { token: "operators.yaml", foreground: "000000" },
    // { token: "type.yaml", foreground: "000000" },
    // { token: "keyword.yaml", foreground: "0000CC" },

    // MARKDOWN

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
