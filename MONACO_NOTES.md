# built-in command contexts

## example usage

```typescript
editor.addCommand(monaco.KeyCode.Enter, function (e: any) {
  console.log("handling enter...");
}, 'editorTextFocus && !suggestWidgetVisible');
```

## list of built-in's

these were obtained via runtime debugging the editor instance, all the available extensions contributed to this available list of context keys

```
accessibilityModeEnabled: true
acceptSuggestionOnEnter: true
accessibilityHelpWidgetVisible: false
atEndOfWord: false
canRedo: false
canUndo: false
editorFocus: undefined
editorHasCodeActionsProvider: false
editorHasCodeLensProvider: false
editorHasCompletionItemProvider: true
editorHasDeclarationProvider: false
editorHasDefinitionProvider: false
editorHasDocumentFormattingProvider: false
editorHasDocumentHighlightProvider: false
editorHasDocumentSelectionFormattingProvider: false
editorHasDocumentSymbolProvider: false
editorHasHoverProvider: false
editorHasImplementationProvider: false
editorHasMultipleDocumentFormattingProvider: false
editorHasMultipleDocumentSelectionFormattingProvider: false
editorHasMultipleSelections: false
editorHasReferenceProvider: false
editorHasRenameProvider: false
editorHasSelection: false
editorHasSignatureHelpProvider: false
editorHasTypeDefinitionProvider: false
editorId: "vs.editor.ICodeEditor:1"
editorLangId: "plaintext"
editorReadonly: false
editorTabMovesFocus: false
editorTextFocus: false
findWidgetVisible: false
foldingEnabled: false
hasNextTabstop: false
hasPrevTabstop: false
hasWordHighlights: false
inSnippetMode: false
isInEmbeddedEditor: false
markersNavigationVisible: false
messageVisible: false
parameterHintsMultipleSignatures: false
parameterHintsVisible: false
referenceSearchVisible: false
suggestWidgetMultipleSuggestions: false
suggestWidgetVisible: false
suggestionMakesTextEdit: true
supportedCodeAction: ""
textInputFocus: false
```