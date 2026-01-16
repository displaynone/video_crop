# Video Crop (Electron + FFmpeg)

App de escritorio para Ubuntu que permite cargar un video grande, seleccionar un rango de tiempo y exportar el recorte usando `ffmpeg`.

## Requisitos

- Node.js + npm
- `ffmpeg` instalado en el sistema (`sudo apt install ffmpeg`)

## Desarrollo

```bash
npm install
npm run dev
```

## Empaquetado para Ubuntu

```bash
npm run dist
```

Genera `AppImage` y `deb` en `dist/`.

## Notas

- El modo "Reencode" es mas lento pero mas preciso.
- El modo "Corte rapido" usa `-c copy` y puede cortar en el keyframe mas cercano.
