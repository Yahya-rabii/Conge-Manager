import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

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
export class DeleteEmployeeComponent {
  nSToDelete = '';
  employee: any = null;
  message = '';

  constructor(private zone: NgZone) {}

  async searchBeforeDelete() {
    if (!this.nSToDelete.trim()) {
      alert('Please enter an NS to search');
      return;
    }

    // Run the search outside Angular to prevent UI freeze
    const foundEmployee = await this.zone.runOutsideAngular(async () => {
      return await (window as any).electron.readAgent(this.nSToDelete);
    });

    // Update UI inside Angular zone
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

    if (!confirm(`Are you sure you want to permanently delete ${this.employee.PRENOM} ${this.employee.NOM}?`)) {
      return;
    }

    // Run delete outside Angular to avoid blocking UI
    await this.zone.runOutsideAngular(async () => {
      await (window as any).electron.deleteEmployee(this.nSToDelete);
    });

    // Update UI inside Angular zone after deletion
    this.zone.run(() => {
      alert('✅ Employee deleted successfully!');
      this.nSToDelete = '';
      this.employee = null;
    });
  }
}
