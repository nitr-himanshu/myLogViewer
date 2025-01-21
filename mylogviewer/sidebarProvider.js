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
        <head>
          <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
          <style>
            body {
              padding: 20px;
              background-color: black;
              color: white;
            }
            .remove-btn {
              background: none;
              border: none;
              cursor: pointer;
            }
            .remove-btn img {
              width: 16px;
              height: 16px;
            }
          </style>
        </head>
        <body>
          <h1 class="mb-4">My Log Viewer</h1>
          <form id="highlightForm" class="mb-4">
            <div class="form-group">
              <label for="text">Text to highlight:</label>
              <input type="text" id="text" name="text" class="form-control">
            </div>
            <div class="form-group">
              <label for="color">Highlight color:</label>
              <input type="color" id="color" name="color" value="#ff0000" class="form-control">
            </div>
            <button type="button" class="btn btn-primary" onclick="addToList()">Add to List</button>
            <button type="button" class="btn btn-warning" onclick="clearHighlights()">Clear</button>
            <button type="button" id="toggleButton" class="btn btn-info" onclick="toggleHighlighted()">Show Highlighted Only</button>
          </form>
          <h2 class="mb-3">Text and Color List</h2>
          <ul id="textColorList" class="list-group"></ul>
          <script>
            const vscode = acquireVsCodeApi();
            const textColorList = document.getElementById('textColorList');
            const toggleButton = document.getElementById('toggleButton');

            function addToList() {
              const text = document.getElementById('text').value;
              const color = document.getElementById('color').value;

              if (text) {
                const duplicate = Array.from(textColorList.querySelectorAll('li')).some(item => item.dataset.text === text);
                if (duplicate) {
                  vscode.postMessage({
                    command: 'showErrorMessage',
                    message: 'Duplicate text. Please add unique text to the list.'
                  });
                  return;
                }

                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                listItem.dataset.text = text;
                listItem.dataset.color = color;

                const textContent = document.createElement('span');
                textContent.textContent = \`Text: \${text}, Color: \${color}\`;

                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-btn');
                removeButton.innerHTML = '<img src="https://image.flaticon.com/icons/svg/1828/1828778.svg" alt="Remove">';
                removeButton.onclick = () => {
                  textColorList.removeChild(listItem);
                  vscode.postMessage({
                    command: 'removeHighlight',
                    text: listItem.dataset.text,
                    color: listItem.dataset.color
                  });
                  updateContent();
                };

                listItem.appendChild(textContent);
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
              while (textColorList.firstChild) {
                textColorList.removeChild(textColorList.firstChild);
              }
              vscode.postMessage({
                command: 'clear'
              });
            }

            function toggleHighlighted() {
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
let highlightedLineNumbers = new Set();
let tabCounter = 0;

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

  for (const line of decorations) {
    highlightedLineNumbers.delete(line.range.start.line);
  }
}

function updateContent(texts, colors) {
  clearHighlights();
  texts.forEach((text, index) => {
    highlightText(text, colors[index]);
  });
}

async function toggleHighlighted(texts, colors) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const text = editor.document.getText();
  const lines = text.split('\n');
  const highlightedLines = [];

  highlightedLineNumbers.forEach(lineNumber => {
    highlightedLines.push({ line: lineNumber, text: lines[lineNumber] });
  });

  highlightedLines.sort((a, b) => a.line - b.line);

  const document = await vscode.workspace.openTextDocument({
    content: highlightedLines.map(line => `${line.line + 1}: ${line.text}`).join('\n'),
    language: editor.document.languageId
  });

  const fileName = editor.document.fileName.split('/').pop();
  tabCounter++;
  const tabTitle = `myLogviewer - ${fileName} - Tab ${tabCounter}`;

  await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Beside, options: { tabTitle, preserveFocus: true } });

  texts.forEach((text, index) => {
    highlightText(text, colors[index]);
  });
}

module.exports = {
  SidebarProvider
};
