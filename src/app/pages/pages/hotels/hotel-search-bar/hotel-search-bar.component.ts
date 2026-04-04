import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE,
  MAT_DATE_FORMATS,
  DateAdapter,
  NativeDateAdapter
} from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';

class HotelSearchDateAdapter extends NativeDateAdapter {
  format(date: Date, displayFormat: any): string {
    if (displayFormat === 'input') {
      const day = ('00' + date.getDate()).slice(-2);
      const month = ('00' + (date.getMonth() + 1)).slice(-2);
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}

const HOTEL_SEARCH_DATE_FORMATS = {
  parse: {
    dateInput: 'dd/MM/yyyy'
  },
  display: {
    dateInput: 'input',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' }
  }
};

@Component({
  selector: 'vex-hotel-search-bar',
  standalone: true,
  templateUrl: './hotel-search-bar.component.html',
  styleUrls: ['./hotel-search-bar.component.scss'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: DateAdapter, useClass: HotelSearchDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: HOTEL_SEARCH_DATE_FORMATS }
  ],
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
