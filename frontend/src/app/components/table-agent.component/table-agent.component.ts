import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-agent',
  templateUrl: './table-agent.component.html',
  styleUrls: ['./table-agent.component.css'],
  imports: [CommonModule],
  standalone: true,
})
export class TableAgentComponent implements OnInit {
  employees: any[] = [];
  totalEmployees = 0;
  page = 1;
  pageSize = 10;
  searchQuery = '';
  isLoading = true;

  constructor(private zone: NgZone) {}

  ngOnInit() {
    this.loadEmployees();
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
      this.isLoading = false; // Stop loading when done
    });
  } catch (error) {
    this.zone.run(() => {
      console.error('Failed to load employees:', error);
      this.isLoading = false; // Stop loading even on error
    });
  }
}


  onSearchChange(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value.trim();
    this.page = 1; // Reset page to 1 on search
    this.loadEmployees();
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

  totalPages(): number {
    return Math.ceil(this.totalEmployees / this.pageSize);
  }
}
