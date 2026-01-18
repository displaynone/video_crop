const { app, BrowserWindow, dialog, ipcMain, protocol } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let runningProcess = null;

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: '#101116',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.ELECTRON_START_URL;
  if (!app.isPackaged && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    return;
  }

  mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('media', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''));
    callback({ path: filePath });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('dialog:openVideo', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select a video',
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] },
      { name: 'All', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:saveVideo', async (_, suggestedName) => {
  const result = await dialog.showSaveDialog({
    title: 'Save export',
    defaultPath: suggestedName || 'crop.mp4',
    filters: [
      { name: 'MP4', extensions: ['mp4'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
});

ipcMain.on('ffmpeg:run', (event, payload) => {
  if (runningProcess) {
    event.sender.send('ffmpeg:error', 'An export process is already running.');
    return;
  }

  const { inputPath, outputPath, startTime, endTime, mode, crop } = payload;
  if (!inputPath || !outputPath) {
    event.sender.send('ffmpeg:error', 'Invalid input or output path.');
    return;
  }

  const duration = Math.max(0, endTime - startTime);
  if (!Number.isFinite(duration) || duration <= 0) {
    event.sender.send('ffmpeg:error', 'The time range is not valid.');
    return;
  }

  const args = [
    '-hide_banner',
    '-y',
    '-ss',
    String(startTime),
    '-i',
    inputPath,
    '-t',
    String(duration)
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const cropValues = crop && Number.isFinite(crop.x) && Number.isFinite(crop.y)
    && Number.isFinite(crop.width) && Number.isFinite(crop.height)
    ? {
        x: clamp(crop.x, 0, 1),
        y: clamp(crop.y, 0, 1),
        width: clamp(crop.width, 0, 1),
        height: clamp(crop.height, 0, 1)
      }
    : null;
  const hasCrop = cropValues && cropValues.width > 0 && cropValues.height > 0;

  if (hasCrop) {
    const { x, y, width, height } = cropValues;
    const cropFilter = [
      `w=trunc(iw*${width}/2)*2`,
      `h=trunc(ih*${height}/2)*2`,
      `x=trunc(iw*${x}/2)*2`,
      `y=trunc(ih*${y}/2)*2`
    ].join(':');
    args.push('-vf', `crop=${cropFilter}`);
  }

  if (mode === 'copy' && !hasCrop) {
    args.push('-c', 'copy');
  } else {
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart'
    );
  }

  args.push(outputPath);

  runningProcess = spawn('ffmpeg', args, { windowsHide: true });

  runningProcess.on('error', (error) => {
    runningProcess = null;
    if (error.code === 'ENOENT') {
      event.sender.send('ffmpeg:error', 'ffmpeg was not found on the system. Install ffmpeg and try again.');
      return;
    }
    event.sender.send('ffmpeg:error', `Error al iniciar ffmpeg: ${error.message}`);
  });

  runningProcess.stderr.on('data', (data) => {
    const text = data.toString();
    event.sender.send('ffmpeg:log', text);

    const match = text.match(/time=([0-9:.]+)/);
    if (match) {
      event.sender.send('ffmpeg:progress', match[1]);
    }
  });

  runningProcess.on('close', (code) => {
    runningProcess = null;
    if (code === 0) {
      event.sender.send('ffmpeg:done');
      return;
    }
    event.sender.send('ffmpeg:error', `ffmpeg exited with code ${code}`);
  });
});

ipcMain.on('ffmpeg:cancel', () => {
  if (runningProcess) {
    runningProcess.kill('SIGINT');
  }
});
