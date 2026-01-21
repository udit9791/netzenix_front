import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-flight-group',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTabsModule
  ],
  templateUrl: './flight-group-request.component.html',
  styleUrls: ['./flight-group-request.component.scss']
})
export class FlightGroupComponent {
  selectedTab = 1;
  groupForm: FormGroup = new FormGroup({
    travelType: new FormControl('Return', Validators.required),
    from: new FormControl('', Validators.required),
    to: new FormControl('', Validators.required),
    departOn: new FormControl(new Date(), Validators.required),
    returnOn: new FormControl(new Date()),
    passengers: new FormControl(10, [Validators.required, Validators.min(1)]),
    expectedFare: new FormControl(''),
    preferredAirlines: new FormControl(''),
    contactNumber: new FormControl('', Validators.required),
    email: new FormControl(''),
    preferredFlightNo: new FormControl(''),
    remarks: new FormControl('')
  });

  submitRequest() {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }
    console.log('Group Request:', this.groupForm.value);
    // TODO: call API
  }
}
