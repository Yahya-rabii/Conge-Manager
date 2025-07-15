import {
  Component,
  NgZone,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  DateAdapter,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
} from '@angular/material/core';
import { Router, NavigationEnd } from '@angular/router';
import { AppDateAdapter, APP_DATE_FORMATS } from '../search-agent.component/custom-date-format';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);

@Component({
  selector: 'app-table-agent',
  templateUrl: './table-agent.component.html',
  styleUrls: ['./table-agent.component.css'],
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
})
export class TableAgentComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  employees: any[] = [];
  totalEmployees = 0;
  page = 1;
  pageSize = 10;
  searchQuery = '';
  isLoading = true;
  selectedUsers: any[] = [];
  bulkErrorUsers: any[] = [];
  showReviewModal = false;
  bulkFrom: Date | null = null;
  bulkTo: Date | null = null;
  bulkDuration = 0;
  searchDebounce: any;

  // Page jump functionality
  pageJumpValue: number | null = null;

  constructor(private zone: NgZone, private router: Router) {}

  ngOnInit() {
    this.loadEmployees();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => {
          this.searchInputRef?.nativeElement?.focus();
        }, 300);
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.searchInputRef.nativeElement.focus();
    }, 300);
  }

  toggleUserSelection(user: any) {
    if (this.selectedUsers.find((u) => u.NS === user.NS)) {
      this.selectedUsers = this.selectedUsers.filter((u) => u.NS !== user.NS);
    } else {
      if (user.SOLDE_Y + user['SOLDE_Y-1'] > 0) {
        this.selectedUsers.push(user);
      } else {
        alert(`❌ ${user.NOM} ${user.PRENOM} n'a pas de solde disponible`);
      }
    }
  }

  openBulkModal() {
    if (this.selectedUsers.length === 0) {
      const toast = document.createElement('div');
      toast.textContent = '⚠️ Aucun agent sélectionné.';
      toast.className =
        'fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded shadow z-50';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }
    this.showReviewModal = true;
  }

 calculateBulkDuration() {
  if (this.bulkFrom && this.bulkTo) {
    const start = this.bulkFrom;
    const end = this.bulkTo;

    const startDay = start.getDay(); // 0 = Sunday
    const endDay = end.getDay();
    const baseDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const startStr = format(start, 'dd/MM/yyyy');
    const endStr = format(end, 'dd/MM/yyyy');
    const year = start.getFullYear();

    const isAugustFull = startStr === `01/08/${year}` && endStr === `31/08/${year}`;
    if (isAugustFull) {
      this.bulkDuration = 31;
      return;
    }

    if (startDay === 5 && endDay === 1 && baseDays === 4) {
      this.bulkDuration = 4;
      return;
    }

    if (startDay === 1 && endDay !== 5) {
      this.bulkDuration = baseDays + 2;
      return;
    }

    if (startDay !== 1 && endDay === 5) {
      this.bulkDuration = baseDays + 2;
      return;
    }

    if (startDay === 1 && endDay === 5) {
      this.bulkDuration = baseDays + 2;
      return;
    }

    this.bulkDuration = baseDays;
  } else {
    this.bulkDuration = 0;
  }
}


  async submitBulkConge(from: Date | null, to: Date | null) {
  this.calculateBulkDuration();
  if (!from || !to || this.bulkDuration === 0) return;

  const nsList = this.selectedUsers.map((u) => u.NS);

  // ✅ Format as yyyy-MM-dd in local time
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');

  const res = await (window as any).electron.bulkUpdateConge({
    nsList,
    from: fromStr,
    to: toStr,
  });

  this.bulkErrorUsers = res.failedAgents || [];
  this.selectedUsers = [];
  this.showReviewModal = false;
  this.bulkDuration = 0;
  this.bulkFrom = null;
  this.bulkTo = null;

  this.loadEmployees();

  if (this.bulkErrorUsers.length > 0) {
    alert(`${this.bulkErrorUsers.length} agents n'ont pas assez de solde.`);
  } else {
    alert('✅ Congés attribués avec succès !');
  }
}
  isUserSelected(emp: any): boolean {
    return this.selectedUsers && this.selectedUsers.some((u: any) => u.NS === emp.NS);
  }

  removeUser(user: any): void {
    this.selectedUsers = this.selectedUsers.filter((u) => u !== user);
  }

  async loadEmployees() {
    this.isLoading = true;
    try {
      const result = await this.zone.runOutsideAngular(() =>
        (window as any).electron.getAllEmployees({
          page: this.page,
          pageSize: this.pageSize,
          query: this.searchQuery,
        })
      );

      this.zone.run(() => {
        this.employees = result.data;
        this.totalEmployees = result.total;
        this.isLoading = false;
      });
    } catch (error) {
      this.zone.run(() => {
        console.error('❌ Failed to load employees:', error);
        this.isLoading = false;
      });
    }
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.page = 1;

    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.loadEmployees();
    }, 400);
  }

  goToPreviousPage() {
    if (this.page > 1) {
      this.page--;
      this.loadEmployees();
    }
  }

  goToNextPage() {
    if (this.page * this.pageSize < this.totalEmployees) {
      this.page++;
      this.loadEmployees();
    }
  }

  // Page jump functionality methods
  onPageJumpInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pageJumpValue = value ? parseInt(value, 10) : null;
  }

  isValidPageJump(): boolean {
    return this.pageJumpValue !== null && 
           this.pageJumpValue >= 1 && 
           this.pageJumpValue <= this.totalPages() &&
           this.pageJumpValue !== this.page;
  }

  jumpToPage(): void {
    if (this.isValidPageJump() && this.pageJumpValue !== null) {
      this.page = this.pageJumpValue;
      this.pageJumpValue = null;
      this.loadEmployees();
    }
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages() && pageNumber !== this.page) {
      this.page = pageNumber;
      this.loadEmployees();
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.page;
    const delta = 2; // Show 2 pages before and after current page
    const pages: number[] = [];

    // Always show first page
    if (current > delta + 1) {
      pages.push(1);
      if (current > delta + 2) {
        pages.push(-1); // Placeholder for ellipsis
      }
    }

    // Show pages around current page
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }

    // Always show last page
    if (current < total - delta) {
      if (current < total - delta - 1) {
        pages.push(-1); // Placeholder for ellipsis
      }
      pages.push(total);
    }

    return pages.filter((page, index, array) => array.indexOf(page) === index);
  }

  totalPages(): number {
    return Math.ceil(this.totalEmployees / this.pageSize);
  }
}
