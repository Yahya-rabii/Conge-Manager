import {
  Component,
  NgZone,
  AfterViewInit,
  inject,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { ElectronService } from '../../core/services/electron.service';

@Component({
  selector: 'app-delete-agent',
  templateUrl: './delete-agent.component.html',
  styleUrls: ['./delete-agent.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class DeleteEmployeeComponent implements AfterViewInit {
  @ViewChild('nsInput') nsInputRef!: ElementRef<HTMLInputElement>;

  private zone = inject(NgZone);
  private electron = inject(ElectronService);

  nSToDelete = '';
  employee: any = null;
  message = '';

  async searchBeforeDelete() {
    if (!this.nSToDelete.trim()) {
      alert('Please enter an NS to search');
      return;
    }

    const foundEmployee = await this.zone.runOutsideAngular(async () => {
      return await (window as any).electron.readAgent(this.nSToDelete);
    });

    this.zone.run(() => {
      this.employee = foundEmployee;
      if (!this.employee) {
        alert(`❌ No employee found with NS ${this.nSToDelete}`);
      }
    });
  }

  async delete() {
    if (!this.employee) {
      alert('Please search for an employee first.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete ${this.employee.PRENOM} ${this.employee.NOM}?`
      )
    ) {
      return;
    }

    await this.zone.runOutsideAngular(async () => {
      await (window as any).electron.deleteEmployee(this.nSToDelete);
    });

    this.zone.run(() => {
      alert('✅ Employee deleted successfully!');
      this.nSToDelete = '';
      this.employee = null;
    });
  }

  ngAfterViewInit() {
    // Refocus fix
    if (this.electron?.ipcRenderer) {
      this.electron.ipcRenderer.on('refocus', () => {
        this.zone.runOutsideAngular(() => {
          const el = document.activeElement as HTMLElement;
          if (el) {
            el.blur();
            setTimeout(() => el.focus(), 100);
          }
        });
      });
    }

    setTimeout(() => {
      this.nsInputRef?.nativeElement?.focus();
    }, 300);
  }
}
