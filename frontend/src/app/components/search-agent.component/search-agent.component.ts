import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { AppDateAdapter, APP_DATE_FORMATS } from './custom-date-format';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);

@Component({
  selector: 'app-search-agent',
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
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: AppDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
  ],
  templateUrl: './search-agent.component.html',
  styleUrls: ['./search-agent.component.css']
})
export class SearchAgentComponent {
  ns = '';
  agent: any = null;
  from: Date | null = null;
  to: Date | null = null;
  duration = 0;

  async search() {
    this.agent = await (window as any).electron.readAgent(this.ns);
    this.from = null;
    this.to = null;
    this.duration = 0;

    if (!this.agent) {
      alert('No employee found with this NS.');
    }
  }

 calculate() {
  if (this.from && this.to) {
    const start = this.from;
    const end = this.to;

    const msPerDay = 1000 * 60 * 60 * 24;
    const baseDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;

    const startStr = format(start, 'dd/MM/yyyy');
    const endStr = format(end, 'dd/MM/yyyy');

    const startDay = start.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const endDay = end.getDay();

    const isAugustFull = (
      startStr === `01/08/${start.getFullYear()}` &&
      endStr === `31/08/${end.getFullYear()}`
    );

    if (isAugustFull) {
      this.duration = 31;
      return;
    }

    if (startDay === 5 && endDay === 1 && baseDays === 4) {
      this.duration = 4;
      return;
    }

    // Starts Monday and ends Friday
    if (startDay === 1 && endDay === 5) {
      this.duration = baseDays + 2;
      return;
    }

    // Starts Monday and ends Monday
    if (startDay === 1 && endDay === 1) {
      this.duration = baseDays + 2;
      return;
    }

    // Starts Friday and ends Friday
    if (startDay === 5 && endDay === 5) {
      this.duration = baseDays + 2;
      return;
    }

    // Starts Monday and ends not Friday
    if (startDay === 1 && endDay !== 5) {
      this.duration = baseDays + 2;
      return;
    }

    // Starts not Monday and ends Friday
    if (startDay !== 1 && endDay === 5) {
      this.duration = baseDays + 2;
      return;
    }

    this.duration = baseDays;
  }
}

  async submit() {
    if (!this.agent || !this.from || !this.to || this.duration <= 0) {
      alert('Invalid data.');
      return;
    }

    if (this.agent.SOLDE < this.duration) {
      alert('Employee does not have enough leave days.');
      return;
    }

    const fromStr = format(this.from, 'yyyy-MM-dd');
    const toStr = format(this.to, 'yyyy-MM-dd');

    const result = await (window as any).electron.updateConge({
      ns: this.agent.NS,
      duration: this.duration,
      from: fromStr,
      to: toStr,
      agent: this.agent,
    });

    if (result === 'DUPLICATE') {
      alert('This leave request already exists.');
    } else {
      alert('Leave request submitted and Word document generated.');
      this.search();
    }
  }
}
