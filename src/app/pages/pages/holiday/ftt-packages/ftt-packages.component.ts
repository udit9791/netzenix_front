import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card'; // ✅ Add this

@Component({
  selector: 'vex-ftt-packages',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatCardModule // ✅ include here
  ],
  templateUrl: './ftt-packages.component.html',
  styleUrls: ['./ftt-packages.component.scss']
})
export class FttPackagesComponent {
  proposalForm: FormGroup;

  nights = ['1 night', '2 nights', '3 nights', '4 nights', '5 nights'];
  nationalities = ['India', 'USA', 'UK', 'UAE'];
  travelers = ['1 room, 2 adults', '2 rooms, 4 adults', '3 rooms, 6 adults'];
  ratings = [3, 4, 5];

  constructor(private fb: FormBuilder) {
    this.proposalForm = this.fb.group({
      destinations: [[]],
      leavingFrom: [''],
      nationality: ['India'],
      leavingOn: [new Date()],
      travelers: ['1 room, 2 adults'],
      rating: [''],
      addTransfers: [true],
      landOnly: [false]
    });
  }

  onSubmit() {
    console.log('Proposal Data:', this.proposalForm.value);
  }
}
