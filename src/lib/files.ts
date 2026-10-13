export interface OutFile {
  name: string;
  text: string;
}

function downloadFile(file: OutFile): void {
  // BOM so that Excel reads Bulgarian text correctly.
  const blob = new Blob(['﻿', file.text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** On phones use the share sheet when possible, otherwise download the files. */
export async function saveFiles(files: OutFile[]): Promise<void> {
  const isTouch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (isTouch && typeof navigator.canShare === 'function' && typeof navigator.share === 'function') {
    const shareFiles = files.map(
      (f) => new File(['﻿', f.text], f.name, { type: 'text/csv' }),
    );
    if (navigator.canShare({ files: shareFiles })) {
      try {
        await navigator.share({ files: shareFiles });
        return;
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        // fall through to download
      }
    }
  }
  files.forEach(downloadFile);
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}
