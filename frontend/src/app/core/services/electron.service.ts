import { Injectable } from '@angular/core';

declare global {
  interface Window {
    electron?: {
      ipcRenderer?: {
        on(channel: string, listener: (...args: any[]) => void): void;
        removeListener(channel: string, listener: (...args: any[]) => void): void;
        // Add other ipcRenderer methods as needed
      };
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  get ipcRenderer() {
    return typeof window !== 'undefined' ? window.electron?.ipcRenderer : undefined;
  }
}
