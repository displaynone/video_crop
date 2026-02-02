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
    height: 760,
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

  const { inputPath, outputPath, startTime, endTime, mode, crop, cropPath } = payload;
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
  const normalizeRect = (rect) => rect && Number.isFinite(rect.x)
    && Number.isFinite(rect.y) && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    ? {
        x: clamp(rect.x, 0, 1),
        y: clamp(rect.y, 0, 1),
        width: clamp(rect.width, 0, 1),
        height: clamp(rect.height, 0, 1)
      }
    : null;
  const cropValues = normalizeRect(crop);
  const cropPathStart = normalizeRect(cropPath?.start);
  const cropPathEnd = normalizeRect(cropPath?.end);
  const hasCrop = cropValues && cropValues.width > 0 && cropValues.height > 0;
  const hasPath = cropPathStart && cropPathEnd
    && cropPathStart.width > 0 && cropPathStart.height > 0
    && cropPathEnd.width > 0 && cropPathEnd.height > 0;

  if (hasPath) {
    const safeDuration = duration > 0 ? duration : 1;
    const lerpExpr = (from, to) =>
      `(${from}+(${to}-${from})*min(max(t/${safeDuration}\\,0)\\,1))`;
    const cropFilter = [
      `w=trunc(iw*${lerpExpr(cropPathStart.width, cropPathEnd.width)}/2)*2`,
      `h=trunc(ih*${lerpExpr(cropPathStart.height, cropPathEnd.height)}/2)*2`,
      `x=trunc(iw*${lerpExpr(cropPathStart.x, cropPathEnd.x)}/2)*2`,
      `y=trunc(ih*${lerpExpr(cropPathStart.y, cropPathEnd.y)}/2)*2`
    ].join(':');
    args.push('-vf', `crop=${cropFilter}:eval=frame`);
  } else if (hasCrop) {
    const { x, y, width, height } = cropValues;
    const cropFilter = [
      `w=trunc(iw*${width}/2)*2`,
      `h=trunc(ih*${height}/2)*2`,
      `x=trunc(iw*${x}/2)*2`,
      `y=trunc(ih*${y}/2)*2`
    ].join(':');
    args.push('-vf', `crop=${cropFilter}`);
  }

  if (mode === 'copy' && !hasCrop && !hasPath) {
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

  let hasEvalError = false;
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
    if (text.includes("Error applying option 'eval'") || text.includes('Option not found')) {
      hasEvalError = true;
    }
    event.sender.send('ffmpeg:log', text);

    const match = text.match(/time=([0-9:.]+)/);
    if (match) {
      event.sender.send('ffmpeg:progress', match[1]);
    }
  });

  runningProcess.on('close', (code) => {
    runningProcess = null;
    if (hasEvalError) {
      event.sender.send(
        'ffmpeg:error',
        'Tu versión de ffmpeg no soporta crop dinámico (eval=frame). Actualiza ffmpeg para usar Path.'
      );
      return;
    }
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
