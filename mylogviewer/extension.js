const vscode = require('vscode');
const SidebarProvider = require("./sidebarProvider.js")

function activate(context) {
  const sidebarProvider = new SidebarProvider.SidebarProvider(context);
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
