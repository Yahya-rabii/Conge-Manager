import { NativeDateAdapter } from '@angular/material/core';

export class AppDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.length === 10) {
      const [day, month, year] = value.split('/');
      const parsed = new Date(+year, +month - 1, +day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: any): string {
    if (!date) return '';
    const day = this._to2digit(date.getDate());
    const month = this._to2digit(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private _to2digit(n: number) {
    return ('00' + n).slice(-2);
  }
}

export const APP_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};
