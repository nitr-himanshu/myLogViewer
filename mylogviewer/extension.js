const vscode = require('vscode');

function activate(context) {
  let disposable = vscode.commands.registerCommand('mylogviewer.highlightText', async function () {
    // Prompt the user to enter text
    const textToHighlight = await vscode.window.showInputBox({
      prompt: 'Enter the text to highlight',
      placeHolder: 'Text to highlight...'
    });

    if (!textToHighlight) {
      vscode.window.showErrorMessage('Please specify the text to highlight.');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const text = editor.document.getText();
    const regex = new RegExp(textToHighlight, 'gi');
    const decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255,0,0,0.3)' // Red background color
    });

    const decorations = [];
    let match;
    while ((match = regex.exec(text))) {
      const startPos = editor.document.positionAt(match.index);
      const line = editor.document.lineAt(startPos.line);
      const decoration = { range: line.range };
      decorations.push(decoration);
    }

    editor.setDecorations(decorationType, decorations);
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
