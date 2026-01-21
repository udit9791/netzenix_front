import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';

@Component({
  selector: 'vex-hotel-search-bar',
  standalone: true,
  templateUrl: './hotel-search-bar.component.html',
  styleUrls: ['./hotel-search-bar.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ]
})
export class HotelSearchBarComponent {
  @Input() form!: FormGroup;
  @Input() locationCtrl!: FormControl;
  @Input() filteredOptions$!: Observable<any[]>;
  @Input() minCheckIn!: Date;
  @Input() minCheckOut!: Date;
  @Input() roomsGuestsLabel: string = '';
  @Input() locationReadonly: boolean = false;

  @Output() selectLocation = new EventEmitter<any>();
  @Output() checkInChange = new EventEmitter<Date>();
  @Output() openRoomsGuests = new EventEmitter<void>();
  @Output() searchClicked = new EventEmitter<void>();
}
