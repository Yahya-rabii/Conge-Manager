import { Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { ElectronService } from './core/services/electron.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule]
})
export class App implements OnInit, OnDestroy {
  private lastFocusedElement: HTMLElement | null = null;
  private focusinHandler = (event: FocusEvent) => {
    this.lastFocusedElement = event.target as HTMLElement;
  };
  private refocusHandler = () => {
    this.zone.run(() => {
      if (this.lastFocusedElement) {
        this.lastFocusedElement.blur();
        setTimeout(() => this.lastFocusedElement!.focus(), 100);
      }
    });
  };

  constructor(private electron: ElectronService, private zone: NgZone) {}

  ngOnInit() {
    window.addEventListener('focusin', this.focusinHandler);

    if (this.electron.ipcRenderer) {
      this.electron.ipcRenderer.on('refocus', this.refocusHandler);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('focusin', this.focusinHandler);

    if (this.electron.ipcRenderer) {
      this.electron.ipcRenderer.removeListener('refocus', this.refocusHandler);
    }
  }
}