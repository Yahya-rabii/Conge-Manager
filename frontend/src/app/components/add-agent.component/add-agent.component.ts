import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-add-agent.component',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './add-agent.component.html',
  styleUrls: ['./add-agent.component.css']
})
export class AddEmployeeComponent {
  employee = {
    NS: '',
    NCIN: '',
    NOM: '',
    PRENOM: '',
    CADRE: '',
    GRADE: '',
    FONCTION: '',
    "SOLDE_Y-2": 0,
    "SOLDE_Y-1": 0,
    "SOLDE_Y": 0,
    SOLDE: 0,
    LAST_UPDATED_YEAR: new Date().getFullYear(),
  };

  constructor(private zone: NgZone) {}

  async submit() {
    if (!this.employee.NS.trim() || !this.employee.NCIN.trim()) {
      alert('NS and NCIN are required');
      return;
    }

    // Run the Electron IPC call outside Angular zone to prevent UI blocking
    await this.zone.runOutsideAngular(async () => {
      await (window as any).electron.addEmployee(this.employee);
    });

    // Re-enter Angular zone to update UI
    this.zone.run(() => {
      alert('Employee added successfully');
      // Reset form
      this.employee = {
        NS: '',
        NCIN: '',
        NOM: '',
        PRENOM: '',
        CADRE: '',
        GRADE: '',
        FONCTION: '',
        "SOLDE_Y-2": 0,
        "SOLDE_Y-1": 0,
        "SOLDE_Y": 0,
        SOLDE: 0,
        LAST_UPDATED_YEAR: new Date().getFullYear(),
      };
    });
  }
}
