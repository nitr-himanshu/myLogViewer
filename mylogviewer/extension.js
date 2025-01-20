const vscode = require('vscode');

class SidebarProvider {
  constructor(context) {
    this._context = context;
  }

  resolveWebviewView(webviewView) {
    this._webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getWebviewContent();

    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'highlight':
          highlightText(message.text, message.color);
          return;
        case 'clear':
          clearHighlights();
          return;
        case 'removeHighlight':
          removeHighlight(message.text, message.color);
          return;
        case 'updateContent':
          updateContent(message.texts, message.colors);
          return;
        case 'toggleHighlighted':
          toggleHighlighted();
          return;
        case 'showErrorMessage':
          vscode.commands.executeCommand('showErrorMessage', message.message);
          return;
      }
    });
  }

  _getWebviewContent() {
    return `
      <html>
        <body>
          <h1>My Log Viewer</h1>
          <form id="highlightForm">
            <label for="text">Text to highlight:</label>
            <input type="text" id="text" name="text"><br><br>
            <label for="color">Highlight color:</label>
            <input type="color" id="color" name="color" value="#ff0000"><br><br>
            <button type="button" onclick="addToList()">Add to List</button>
            <button type="button" onclick="clearHighlights()">Clear</button>
            <button type="button" id="toggleButton" onclick="toggleHighlighted()">Show Highlighted Only</button>
          </form>
          <h2>Text and Color List</h2>
          <ul id="textColorList"></ul>
          <script>
            const vscode = acquireVsCodeApi();
            const textColorList = document.getElementById('textColorList');
            const toggleButton = document.getElementById('toggleButton');
            let showingHighlightedOnly = false;

            function addToList() {
              const text = document.getElementById('text').value;
              const color = document.getElementById('color').value;

              if (text) {
                // Check for duplicate text
                const duplicate = Array.from(textColorList.querySelectorAll('li')).some(item => item.dataset.text === text);
                if (duplicate) {
                  vscode.postMessage({
                    command: 'showErrorMessage',
                    message: 'Duplicate text. Please add unique text to the list.'
                  });
                  return;
                }

                const listItem = document.createElement('li');
                listItem.textContent = \`Text: \${text}, Color: \${color}\`;
                listItem.dataset.text = text;
                listItem.dataset.color = color;

                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.onclick = () => {
                  textColorList.removeChild(listItem);
                  vscode.postMessage({
                    command: 'removeHighlight',
                    text: listItem.dataset.text,
                    color: listItem.dataset.color
                  });
                  updateContent();
                };
                listItem.appendChild(removeButton);
                textColorList.appendChild(listItem);
                updateContent();
                vscode.postMessage({
                  command: 'highlight',
                  text,
                  color
                });
              }
            }

            function updateContent() {
              const texts = [];
              const colors = [];
              textColorList.querySelectorAll('li').forEach(item => {
                texts.push(item.dataset.text);
                colors.push(item.dataset.color);
              });
              vscode.postMessage({
                command: 'updateContent',
                texts,
                colors
              });
            }

            function clearHighlights() {
            textColorList
            while (textColorList.firstChild) {
             textColorList.removeChild(textColorList.firstChild);
            }
              vscode.postMessage({
                command: 'clear'
              });
            }

            function toggleHighlighted() {
              showingHighlightedOnly = !showingHighlightedOnly;
              toggleButton.textContent = showingHighlightedOnly ? 'Show All' : 'Show Highlighted Only';
              const texts = [];
              const colors = [];
              textColorList.querySelectorAll('li').forEach(item => {
                texts.push(item.dataset.text);
                colors.push(item.dataset.color);
              });
              vscode.postMessage({
                command: 'toggleHighlighted',
                texts,
                colors
              });
            }
          </script>
        </body>
      </html>
    `;
  }
}

let decorationTypes = [];
let originalText = [];
let highlightedLineNumbers = new Set();
let showingHighlightedOnly = false;

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
  const decorations = [];
  let match;
  while ((match = regex.exec(text))) {
    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.lineAt(startPos.line).range.end;
    const range = new vscode.Range(startPos, endPos);
    decorations.push({ range });
    highlightedLineNumbers.add(startPos.line);
  }

  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: color
  });
  editor.setDecorations(decorationType, decorations);
  decorationTypes.push(decorationType);
}

function clearHighlights() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  decorationTypes.forEach(decorationType => {
    editor.setDecorations(decorationType, []);
  });
  decorationTypes = [];
  highlightedLineNumbers.clear();
}

function removeHighlight(textToHighlight, color) {
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
  const decorations = [];
  let match;
  while ((match = regex.exec(text))) {
    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.lineAt(startPos.line).range.end;
    const range = new vscode.Range(startPos, endPos);
    decorations.push({ range });
  }

  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: color
  });
  editor.setDecorations(decorationType, []);
  decorationTypes = decorationTypes.filter(dt => dt !== decorationType);

  // Remove line numbers from highlightedLineNumbers set
  for (const line of decorations) {
    highlightedLineNumbers.delete(line.range.start.line);
  }
}

function updateContent(texts, colors) {
  // Clear all current decorations
  clearHighlights();

  // Highlight the new set of texts and colors
  texts.forEach((text, index) => {
    highlightText(text, colors[index]);
  });
}

async function toggleHighlighted(texts, colors) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (showingHighlightedOnly) {
    // Restore original content
    await editor.edit(editBuilder => {
      editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), originalText.join('\n'));
    });
    showingHighlightedOnly = false;
  } else {
    // Show only highlighted lines
    const text = editor.document.getText();
    const lines = text.split('\n');
    originalText = lines.slice(); // Keep a copy of the original text
    const highlightedLines = [];

    highlightedLineNumbers.forEach(lineNumber => {
      highlightedLines.push(lines[lineNumber]);
    });

    await editor.edit(editBuilder => {
      editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), highlightedLines.join('\n'));
    });
    showingHighlightedOnly = true;
  }
  clearHighlights();
  texts.forEach((text, index) => {
    highlightText(text, colors[index]);
  });
}

function activate(context) {
  const sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('mylogviewer-sidebar', sidebarProvider));

  context.subscriptions.push(vscode.commands.registerCommand('showErrorMessage', (message) => {
    vscode.window.showErrorMessage(message);
  }));
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
