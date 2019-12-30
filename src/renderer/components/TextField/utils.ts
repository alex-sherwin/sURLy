// third party
import monacoEditor from "monaco-editor";

export const disableOneLineEditorFunctionality = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor): void => {

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

  // disable delete line remainder
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Delete, function () { });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backspace, function () { });

  // disable delete word
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Delete, function () { });
  editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Backspace, function () { });

  // disable enter (only during text editor focus)
  editor.addCommand(monaco.KeyCode.Enter, function (e: any) { }, 'editorTextFocus && !suggestWidgetVisible');
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () { });

  // disable command pallette
  editor.addCommand(monaco.KeyCode.F1, function () { });

};
