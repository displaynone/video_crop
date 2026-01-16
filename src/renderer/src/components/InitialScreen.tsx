import type { DragEvent, FC } from 'react';
import { useState } from 'react';
import { ExportIcon } from '@phosphor-icons/react';
import { loadVideoFromPath, openVideo } from '../lib/videoActions';

const InitialScreen: FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    const filePath = (file as File & { path?: string }).path ?? '';
    if (filePath) {
      loadVideoFromPath(filePath);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  return (
    <section className="flex min-h-screen w-full">
      <div
        className={[
          'relative flex min-h-screen w-full flex-col items-center justify-center gap-6 text-center transition',
          isDragging
            ? 'border border-dashed border-amber-200/70 shadow-2xl shadow-amber-300/10'
            : 'shadow-2xl shadow-black/30'
        ].join(' ')}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_70%)]" />
        )}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-amber-200">
          <ExportIcon size={32} />
        </div>
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.45em] text-white/60">Arrastra tu video</p>
          <h1 className="font-display text-4xl font-semibold">Suelta aqui para comenzar</h1>
          <p className="text-sm text-white/70">
            Acepta archivos locales. Tambien puedes elegir un archivo desde el dialogo del sistema.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openVideo}>
          Elegir video
        </button>
      </div>
    </section>
  );
};

export default InitialScreen;
