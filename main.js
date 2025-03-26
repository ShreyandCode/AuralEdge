const { app, BrowserWindow, nativeImage, Menu } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        webPreferences: {
            nodeIntegration: true
        },
        icon: icon // Set custom icon for window & taskbar
    });

    // Remove menu bar
    mainWindow.setMenuBarVisibility(false); // Hides the menu bar
    Menu.setApplicationMenu(null); // Completely removes the menu

    mainWindow.loadFile('index.html');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});