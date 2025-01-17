const vscode = require('vscode');

let decorationType;

function activate(context) {
  // Command to highlight text
  let highlightDisposable = vscode.commands.registerCommand('mylogviewer.highlightText', async function () {
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
    decorationType = vscode.window.createTextEditorDecorationType({
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

  // Command to clear all highlights
  let clearDisposable = vscode.commands.registerCommand('mylogviewer.clearHighlights', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    if (decorationType) {
      editor.setDecorations(decorationType, []);
    }
  });

  // Command to open sidebar
  let sidebarDisposable = vscode.commands.registerCommand('mylogviewer.openSidebar', function () {
    const panel = vscode.window.createWebviewPanel(
      'mylogviewerSidebar',
      'My Log Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'highlight':
          highlightText(message.text, message.color);
          return;
      }
    });
  });

  context.subscriptions.push(highlightDisposable);
  context.subscriptions.push(clearDisposable);
  context.subscriptions.push(sidebarDisposable);
}

function getWebviewContent() {
  return `
    <html>
      <body>
        <h1>My Log Viewer</h1>
        <form id="highlightForm">
          <label for="text">Text to highlight:</label>
          <input type="text" id="text" name="text"><br><br>
          <label for="color">Highlight color:</label>
          <input type="color" id="color" name="color" value="#ff0000"><br><br>
          <button type="button" onclick="highlightText()">Highlight</button>
        </form>
        <script>
          const vscode = acquireVsCodeApi();
          function highlightText() {
            const text = document.getElementById('text').value;
            const color = document.getElementById('color').value;
            vscode.postMessage({
              command: 'highlight',
              text: text,
              color: color
            });
          }
        </script>
      </body>
    </html>
  `;
}

async function highlightText(textToHighlight, color) {
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
  decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: color // Use selected color
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
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
