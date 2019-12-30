// third party
import React, { FC } from "react";
import monacoEditor from "monaco-editor";

// local
import { styled } from "../../theme";

// really local
import { WrappedMonacoEditor, WrappedMonagoEditorProps } from "./WrappedMonacoEditor";
import { TEXT_VAR_CLASS, TEXT_VAR_INLINE_CLASS } from "./theme/common";

interface ThemedMonacoEditorProps extends Omit<WrappedMonagoEditorProps, "customTheme"> {
  theme: "dark";
}

export const ThemedMonacoEditor: FC<ThemedMonacoEditorProps> = ({ theme, ...rest }) => {
  switch (theme) {
    case "dark": return <DarkThemedMonacoEditor {...rest} customTheme={DARK_THEME} />;
  }
};

const DarkThemedMonacoEditor = styled(WrappedMonacoEditor)`

  .${TEXT_VAR_CLASS} {
    z-index: 1;
  }

  .${TEXT_VAR_INLINE_CLASS} {
    z-index: 2;
    position: relative;
    color: #e7ed18;
    border-bottom: solid 1px #e7ed18;
  }

  .view-lines span.mtk1 {
    text-shadow: 0 0 4px #239440, 0 0 6px #227d39, 0 0 8px #2e362e;
    filter: saturate(90%);
  }

`;

const DARK_THEME_BG_COLOR = "#222224";

export const DARK_THEME: monacoEditor.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: undefined!, background: DARK_THEME_BG_COLOR, foreground: "#0aff4b" },
  ],
  colors: {
    "editorGutter.background": DARK_THEME_BG_COLOR,

    "editor.background": DARK_THEME_BG_COLOR,
    "editor.foreground": "#0aff4b",

    "editorCursor.background": DARK_THEME_BG_COLOR,
    "editorCursor.foreground": "#0aff4b",

    "editor.selectionBackground": "#216131",
    "editor.selectionHighlightBackground": "#193620",
    "editor.selectionForeground": "#000000",

    "background": DARK_THEME_BG_COLOR,
    "foreground": "#ff0000",
  }
};
