import {
  Component,
  NgZone,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
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
  selector: 'app-add-agent.component',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './add-agent.component.html',
  styleUrls: ['./add-agent.component.css'],
  standalone: true,
})
export class AddEmployeeComponent implements AfterViewInit {
  @ViewChild('nsInput') nsInputRef!: ElementRef<HTMLInputElement>;

  private zone = inject(NgZone);
  private electron = inject(ElectronService);

  employee = {
    NS: '',
    NCIN: '',
    NOM: '',
    PRENOM: '',
    CADRE: '',
    GRADE: '',
    FONCTION: '',
    'SOLDE_Y-2': 0,
    'SOLDE_Y-1': 0,
    'SOLDE_Y': 0,
    SOLDE: 0,
    LAST_UPDATED_YEAR: new Date().getFullYear(),
  };

  async submit() {
    if (!this.employee.NS.trim() || !this.employee.NCIN.trim()) {
      alert('NS and NCIN are required');
      return;
    }

    await this.zone.runOutsideAngular(async () => {
      await (window as any).electron.addEmployee(this.employee);
    });

    this.zone.run(() => {
      alert('Employee added successfully');
      this.employee = {
        NS: '',
        NCIN: '',
        NOM: '',
        PRENOM: '',
        CADRE: '',
        GRADE: '',
        FONCTION: '',
        'SOLDE_Y-2': 0,
        'SOLDE_Y-1': 0,
        'SOLDE_Y': 0,
        SOLDE: 0,
        LAST_UPDATED_YEAR: new Date().getFullYear(),
      };
    });
  }

  ngAfterViewInit() {
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
