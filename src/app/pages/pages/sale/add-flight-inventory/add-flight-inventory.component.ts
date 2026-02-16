import { Component, OnInit, Inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDatepickerModule,
  MatDatepickerInputEvent
} from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  DateAdapter,
  NativeDateAdapter
} from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  Observable,
  map,
  startWith,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  tap,
  filter,
  combineLatest
} from 'rxjs';

import { MultiDatePickerComponent } from 'src/app/shared/multi-date-picker/multi-date-picker.component';
import { FlightInventoryService } from 'src/app/services/flight-inventory.service';
import { AirportService, Airport } from 'src/app/services/airport.service';
import { AirlineService, Airline } from 'src/app/services/airline.service';
import { FareRuleService } from '../../../../services/fare-rule.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'vex-add-flight-inventory-preview-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>Confirm Flight Inventory</h2>
    <mat-dialog-content class="max-h-[70vh] overflow-auto">
      <div class="mb-2">
        <div><span class="font-semibold">Sector:</span> {{ data?.sector }}</div>
        <div>
          <span class="font-semibold">Main Flight Date:</span>
          {{ data?.flight_date }}
        </div>
        <div>
          <span class="font-semibold">Seats Allocated:</span>
          {{ data?.seat_allocated }}
        </div>
        <div>
          <span class="font-semibold">Price Per Seat:</span>
          {{ data?.sell_price }}
        </div>
        <div>
          <span class="font-semibold">Refundable:</span>
          {{ data?.is_refundable ? 'Yes' : 'No' }}
        </div>
      </div>

      <div class="mt-4">
        <div class="font-semibold mb-2">Leg Details</div>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b">
              <th class="text-left p-1">Type</th>
              <th class="text-left p-1">From</th>
              <th class="text-left p-1">To</th>
              <th class="text-left p-1">Date</th>
              <th class="text-left p-1">Dep</th>
              <th class="text-left p-1">Arr</th>
              <th class="text-left p-1">Airline</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of data?.details" class="border-b">
              <td class="p-1">{{ d.type }}</td>
              <td class="p-1">{{ d.from }}</td>
              <td class="p-1">{{ d.to }}</td>
              <td class="p-1">{{ d.flight_date }}</td>
              <td class="p-1">{{ d.dep_time }}</td>
              <td class="p-1">{{ d.arr_time }}</td>
              <td class="p-1">{{ d.airline }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="data?.fare_rules?.length" class="mt-4">
        <div class="font-semibold mb-2">Refund Rules</div>
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b">
              <th class="text-left p-1">Days Before Departure</th>
              <th class="text-left p-1">Refundable Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of data.fare_rules" class="border-b">
              <td class="p-1">{{ r.days_before_departure }}</td>
              <td class="p-1">{{ r.refundable_amount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close('cancel')">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        (click)="dialogRef.close('confirm')">
        Confirm and Create
      </button>
    </mat-dialog-actions>
  `,
  imports: [CommonModule, MatDialogModule, MatButtonModule]
})
export class AddFlightInventoryPreviewDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AddFlightInventoryPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}

export class AddFlightDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    }
    return super.format(date, displayFormat);
  }
}

export const ADD_FLIGHT_DATE_FORMATS = {
  parse: {
    dateInput: 'input'
  },
  display: {
    dateInput: 'input',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'input',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

@Component({
  selector: 'vex-add-flight-inventory',
  templateUrl: './add-flight-inventory.component.html',
  styleUrls: ['./add-flight-inventory.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatDividerModule,
    MatAutocompleteModule,
    MultiDatePickerComponent,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: AddFlightDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: ADD_FLIGHT_DATE_FORMATS }
  ]
})
export class AddFlightInventoryComponent implements OnInit {
  flightForm!: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private flightService: FlightInventoryService,
    private fareRuleService: FareRuleService,
    private notificationService: NotificationService,
    private router: Router,
    private _snackBar: MatSnackBar,
    private airportService: AirportService,
    private airlineService: AirlineService,
    private dialog: MatDialog
  ) {}

  today: Date = new Date();
  timeSlots: string[] = [];
  filteredArrivalTimeSlots: { [key: number]: string[] } = {};
  loading = false;

  // Airport autocomplete
  filteredFromAirports: { [key: number]: Observable<Airport[]> } = {};
  filteredToAirports: { [key: number]: Observable<Airport[]> } = {};
  filteredReturnFromAirports: { [key: number]: Observable<Airport[]> } = {};
  filteredReturnToAirports: { [key: number]: Observable<Airport[]> } = {};

  // Airline codes
  airlines: Airline[] = [];
  filteredAirlines: { [key: number]: Observable<Airline[]> } = {};
  filteredDepTimesOnward: {
    [key: number]: Observable<{ label: string; items: string[] }[]>;
  } = {};
  filteredArrTimesOnward: {
    [key: number]: Observable<{ label: string; items: string[] }[]>;
  } = {};
  filteredDepTimesReturn: {
    [key: number]: Observable<{ label: string; items: string[] }[]>;
  } = {};
  filteredArrTimesReturn: {
    [key: number]: Observable<{ label: string; items: string[] }[]>;
  } = {};

  ngOnInit(): void {
    this.generateTimeSlots();
    this.loadAirlines();
    this.flightForm = this.fb.group({
      onwardFlights: this.fb.array([this.createFlightGroup()]),
      hasReturn: [false],
      returnFlights: this.fb.array([]),

      // Series details
      availableSeats: [null, [Validators.required, Validators.min(1)]],
      availableFor: ['anywhere', Validators.required],
      bookingCutOff: [null, [Validators.required, Validators.min(0)]],
      namingCutOff: [null, [Validators.required, Validators.min(0)]],
      pricePerSeat: [null, [Validators.required, Validators.min(0)]],
      allowTbaUser: [false],
      allowHoldBooking: [false],
      holdBookingAmount: [null, Validators.min(0)],
      holdBookingType: ['percentage'],
      holdBookingCutOffDays: [null, Validators.min(0)],
      holdBookingLimit: [null, Validators.min(1)],
      infantPrice: [null, Validators.min(0)],

      // Refundable/Non-Refundable
      isRefundable: ['non-refundable', Validators.required],
      fareRules: this.fb.array([]),

      // Meal and Seat Options
      mealOption: ['complimentary', Validators.required],
      seatOption: ['complimentary', Validators.required],

      // Special Tag
      specialTag: ['']
    });

    // Listen for changes to price per seat and departure date to revalidate fare rules
    this.flightForm.get('pricePerSeat')?.valueChanges.subscribe(() => {
      this.revalidateFareRules();
    });

    this.onwardFlights
      .at(0)
      ?.get('departureDate')
      ?.valueChanges.subscribe(() => {
        this.revalidateFareRules();
      });

    // Add conditional validation for hold booking fields
    this.flightForm
      .get('allowHoldBooking')
      ?.valueChanges.subscribe((allowHold) => {
        const holdBookingAmount = this.flightForm.get('holdBookingAmount');
        const holdBookingCutOffDays = this.flightForm.get(
          'holdBookingCutOffDays'
        );
        const holdBookingLimit = this.flightForm.get('holdBookingLimit');
        const holdBookingType = this.flightForm.get('holdBookingType');

        if (allowHold) {
          holdBookingAmount?.setValidators([
            Validators.required,
            Validators.min(0)
          ]);
          holdBookingCutOffDays?.setValidators([
            Validators.required,
            Validators.min(1),
            this.maxHoldBookingDaysValidator(30)
          ]);
          holdBookingLimit?.setValidators([
            Validators.required,
            Validators.min(1),
            this.maxHoldBookingLimitValidator()
          ]);
          this.updateHoldAmountValidation(holdBookingType?.value);
        } else {
          holdBookingAmount?.clearValidators();
          holdBookingCutOffDays?.clearValidators();
          holdBookingLimit?.clearValidators();
        }

        holdBookingAmount?.updateValueAndValidity();
        holdBookingCutOffDays?.updateValueAndValidity();
        holdBookingLimit?.updateValueAndValidity();
      });

    // Update hold booking limit validation when cut-off days change
    this.flightForm.get('holdBookingCutOffDays')?.valueChanges.subscribe(() => {
      if (this.flightForm.get('allowHoldBooking')?.value) {
        this.flightForm.get('holdBookingLimit')?.updateValueAndValidity();
      }
    });

    // Add validation based on hold booking type (percentage/flat)
    this.flightForm.get('holdBookingType')?.valueChanges.subscribe((type) => {
      if (this.flightForm.get('allowHoldBooking')?.value) {
        this.updateHoldAmountValidation(type);
      }
    });

    // Subscribe to pricePerSeat changes to validate holdBookingAmount for flat type
    this.flightForm.get('pricePerSeat')?.valueChanges.subscribe(() => {
      if (
        this.flightForm.get('allowHoldBooking')?.value &&
        this.flightForm.get('holdBookingType')?.value === 'flat'
      ) {
        this.flightForm.get('holdBookingAmount')?.updateValueAndValidity();
      }
    });

    // Setup airport and airline autocomplete for initial flight groups
    if (this.onwardFlights.at(0)) {
      this.setupAirportAutocomplete(
        this.onwardFlights.at(0) as FormGroup,
        0,
        'onward'
      );
      this.setupAirlineAutocomplete(
        this.onwardFlights.at(0) as FormGroup,
        0,
        'onward'
      );
      this.setupTimeAutocomplete(
        this.onwardFlights.at(0) as FormGroup,
        0,
        'onward'
      );
    }

    // Setup airport and airline autocomplete for initial return flight if exists
    if (this.returnFlights.length > 0 && this.returnFlights.at(0)) {
      this.setupAirportAutocomplete(
        this.returnFlights.at(0) as FormGroup,
        0,
        'return'
      );
      this.setupAirlineAutocomplete(
        this.returnFlights.at(0) as FormGroup,
        0,
        'return'
      );
      this.setupTimeAutocomplete(
        this.returnFlights.at(0) as FormGroup,
        0,
        'return'
      );
    }

    this.flightForm.get('hasReturn')?.valueChanges.subscribe((v) => {
      if (v) {
        this.buildReturnFromOnward();
      } else {
        while (this.returnFlights.length) {
          this.returnFlights.removeAt(this.returnFlights.length - 1);
        }
      }
    });

    this.onwardFlights.valueChanges.subscribe(() => {
      if (this.flightForm.get('hasReturn')?.value) {
        this.buildReturnFromOnward();
      }
    });
  }

  private formatToDdMmYy(date: Date | null | undefined): string | null {
    if (!date) return null;
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    return `${d}-${m}-${y}`;
  }

  onDepartureDateChange(
    event: MatDatepickerInputEvent<Date>,
    index: number,
    type: 'onward' | 'return'
  ): void {
    const formatted = this.formatToDdMmYy(event.value);
    console.log('Departure Date selected', { type, index, formatted });
  }

  onArrivalDateChange(
    event: MatDatepickerInputEvent<Date>,
    index: number,
    type: 'onward' | 'return'
  ): void {
    const formatted = this.formatToDdMmYy(event.value);
    console.log('Arrival Date selected', { type, index, formatted });
  }

  getDateValue(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      if (val.includes('T')) {
        const d = val.split('T')[0];
        const parts = d.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return new Date(y, m, day);
        }
      }
      if (val.includes('/')) {
        const parts = val.split('/');
        if (parts.length === 3) {
          const m = parseInt(parts[0], 10) - 1;
          const d = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          return new Date(y, m, d);
        }
      }
      if (val.includes('-')) {
        const parts = val.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(y, m, d);
        }
      }
    }
    return null;
  }

  generateTimeSlots() {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 1) {
        // step = 1 minute
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        times.push(`${hh}:${mm}`);
      }
    }
    this.timeSlots = times;
  }

  private buildReturnFromOnward(): void {
    const onwardCount = this.onwardFlights.length;
    while (this.returnFlights.length > onwardCount) {
      this.returnFlights.removeAt(this.returnFlights.length - 1);
    }
    while (this.returnFlights.length < onwardCount) {
      const newGroup = this.createFlightGroup();
      newGroup.get('departureDate')?.setValue(null);
      newGroup.get('arrivalDate')?.setValue(null);
      newGroup.get('departureTime')?.setValue('');
      newGroup.get('arrivalTime')?.setValue('');
      this.returnFlights.push(newGroup);
      const idx = this.returnFlights.length - 1;
      this.setupAirportAutocomplete(newGroup, idx, 'return');
      this.setupAirlineAutocomplete(newGroup, idx, 'return');
      this.setupTimeAutocomplete(newGroup, idx, 'return');
    }
    for (let rIdx = 0; rIdx < onwardCount; rIdx++) {
      const oIdx = onwardCount - 1 - rIdx;
      const og = this.onwardFlights.at(oIdx) as FormGroup;
      const rg = this.returnFlights.at(rIdx) as FormGroup;

      const fromVal = og.get('fromAirport')?.value;
      const toVal = og.get('toAirport')?.value;
      const toCode =
        typeof toVal === 'object' && toVal?.code ? toVal.code : toVal || '';
      const fromCode =
        typeof fromVal === 'object' && fromVal?.code
          ? fromVal.code
          : fromVal || '';
      rg.get('fromAirport')?.setValue(toCode);
      rg.get('toAirport')?.setValue(fromCode);
      rg.get('from_id')?.setValue(og.get('to_id')?.value || null);
      rg.get('to_id')?.setValue(og.get('from_id')?.value || null);
      rg.get('airline')?.setValue(og.get('airline')?.value || '');
      rg.get('airline_id')?.setValue(og.get('airline_id')?.value || '');
      rg.get('airlineCode')?.setValue(og.get('airlineCode')?.value || '');
      rg
        .get('airlineSearch')
        ?.setValue(og.get('airline')?.value || '', { emitEvent: false });
      rg.get('flightNumber')?.setValue(og.get('flightNumber')?.value || '');
      rg.get('pnrNumber')?.setValue(og.get('pnrNumber')?.value || '');
      rg.get('baggage')?.setValue(og.get('baggage')?.value || '');
      rg.get('cabinBaggage')?.setValue(og.get('cabinBaggage')?.value || '');
    }
  }

  canEnableReturn(): boolean {
    const count = this.onwardFlights.length;
    if (count === 0) return false;
    for (let i = 0; i < count; i++) {
      const g = this.onwardFlights.at(i) as FormGroup;
      const fromVal = g.get('fromAirport')?.value;
      const toVal = g.get('toAirport')?.value;
      if (!fromVal || !toVal) return false;
    }
    return true;
  }

  createFlightGroup(): FormGroup {
    const group = this.fb.group({
      departureDate: ['', Validators.required],
      arrivalDate: [''],
      baggage: [''],
      airlineSearch: [''],
      airlineCode: ['', Validators.required],
      airline_id: [''], // Added airline_id field
      airline: [''], // Added airline name field
      flightNumber: ['', Validators.required],
      pnrNumber: [''],
      terminal: [''],
      departureTerminal: [''],
      arrivalTerminal: [''],
      cabinBaggage: [''],
      fromAirport: ['', Validators.required],
      toAirport: ['', Validators.required],
      from_id: [''],
      to_id: [''],
      departureTime: [
        '',
        [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]
      ],
      arrivalTime: [
        '',
        [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]
      ]
    });

    // Listen for departure time changes to filter arrival times
    group.get('departureTime')?.valueChanges.subscribe((time) => {
      if (time) {
        this.updateArrivalTimeOptions(group, time);
      }
    });

    // Listen for airline code changes to update flight number format
    group.get('airlineCode')?.valueChanges.subscribe((code) => {
      if (code) {
        // Set flight number to just the airline code, clearing any existing content
        group.get('flightNumber')?.setValue(code);
      }
    });

    return group;
  }

  updateFlightNumber(
    index: number,
    type: 'onward' | 'return' = 'onward',
    event?: any
  ): void {
    const flights =
      type === 'onward'
        ? (this.onwardFlights.at(index) as FormGroup)
        : (this.returnFlights.at(index) as FormGroup);

    // Get airline code from event if provided (from autocomplete) or from form control
    let airlineCode = '';
    let airlineName = '';
    let airlineId = '';

    if (event && event.option) {
      // If event comes from autocomplete selection
      const selectedAirline = event.option.value;

      // Get airline details from the selected airline object
      if (selectedAirline && selectedAirline.code) {
        airlineCode = selectedAirline.code;
        airlineName = selectedAirline.name;
        airlineId = selectedAirline.id.toString(); // Convert number to string

        // Console log the selected airline code
        console.log('Selected airline code:', airlineCode);

        // Update the form controls with the selected airline values
        flights.get('airlineCode')?.setValue(airlineCode);
        flights.get('airline')?.setValue(airlineName);
        flights.get('airline_id')?.setValue(airlineId);

        // Update the airlineSearch control to display only the airline name
        flights
          .get('airlineSearch')
          ?.setValue(airlineName, { emitEvent: false });

        // Clear the flight number and set only the airline code
        flights.get('flightNumber')?.setValue(airlineCode);
      }
    } else {
      airlineCode = flights.get('airlineCode')?.value;
    }
  }

  loadAirlines(): void {
    this.airlineService.getAirlines().subscribe({
      next: (airlinesResponse) => {
        this.airlines = airlinesResponse.data;
      },
      error: (error) => {
        console.error('Error loading airlines:', error);
        // Fallback to static data if API fails
        this.airlines = [
          { id: 1, code: '6E', name: 'Indigo' },
          { id: 2, code: 'AI', name: 'Air India Limited' },
          { id: 3, code: 'SG', name: 'SpiceJet' }
        ];
      }
    });
  }

  setupAirlineAutocomplete(
    flightGroup: FormGroup,
    index: number,
    type: 'onward' | 'return'
  ): void {
    const searchControl = flightGroup.get('airlineSearch') as AbstractControl;

    if (!searchControl) return;

    // Set a unique index for each flight group based on type and index
    const uniqueIndex = type === 'onward' ? index : index + 100;

    this.filteredAirlines[uniqueIndex] = searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        const searchValue = typeof value === 'string' ? value : '';
        if (searchValue.length < 2) {
          return of(this.airlines.slice(0, 10));
        }
        return this.airlineService.searchAirlines(searchValue);
      })
    );
  }

  // Filter arrival times based on departure time
  updateArrivalTimeOptions(group: FormGroup, departureTime: string): void {
    const arrivalTimeControl = group.get('arrivalTime');
    const currentArrivalTime = arrivalTimeControl?.value;

    // Find the index of the departure time in the timeSlots array
    const depTimeIndex = this.timeSlots.findIndex((t) => t === departureTime);

    if (depTimeIndex !== -1) {
      // Get all times from departure time onwards
      const validArrivalTimes = this.timeSlots.slice(depTimeIndex);

      // If current arrival time is before departure time, reset it
      if (
        currentArrivalTime &&
        this.timeSlots.indexOf(currentArrivalTime) < depTimeIndex
      ) {
        arrivalTimeControl?.setValue(departureTime);
      }
    }
  }

  // Getters
  get onwardFlights(): FormArray {
    return this.flightForm.get('onwardFlights') as FormArray;
  }
  get returnFlights(): FormArray {
    return this.flightForm.get('returnFlights') as FormArray;
  }

  get fareRules(): FormArray {
    return this.flightForm.get('fareRules') as FormArray;
  }

  createFareRuleGroup(): FormGroup {
    return this.fb.group({
      days: [
        null,
        [
          Validators.required,
          Validators.min(1),
          this.validateDaysBeforeDeparture.bind(this)
        ]
      ],
      amount: [
        null,
        [
          Validators.required,
          Validators.min(0),
          this.validateRefundAmount.bind(this)
        ]
      ]
    });
  }

  validateDaysBeforeDeparture(control: AbstractControl) {
    if (!control.value) return null;

    const departureDate = this.onwardFlights.at(0)?.get('departureDate')?.value;
    if (!departureDate) return null;

    const today = new Date();
    const departure = new Date(departureDate);
    const diffTime = Math.abs(departure.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return control.value > diffDays ? { exceedsDeparture: true } : null;
  }

  validateRefundAmount(control: AbstractControl) {
    if (!control.value) return null;

    const pricePerSeat = this.flightForm.get('pricePerSeat')?.value;
    if (!pricePerSeat) return null;

    return control.value > pricePerSeat ? { exceedsPrice: true } : null;
  }

  // Method to update hold booking amount validation based on type
  updateHoldAmountValidation(type: string): void {
    const holdBookingAmount = this.flightForm.get('holdBookingAmount');

    if (type === 'percentage') {
      holdBookingAmount?.setValidators([
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]);
    } else {
      // For flat amount, we don't allow it to be greater than seat price
      holdBookingAmount?.setValidators([
        Validators.required,
        Validators.min(0),
        this.validateFlatAmount.bind(this)
      ]);
    }

    holdBookingAmount?.updateValueAndValidity();
  }

  // Custom validator for hold booking amount
  validateHoldBookingAmount(control: AbstractControl) {
    if (!control.value) return null;

    const holdBookingType = this.flightForm.get('holdBookingType')?.value;

    if (holdBookingType === 'percentage') {
      return control.value > 100 ? { max: true } : null;
    }

    return null;
  }

  // Custom validator for flat amount not exceeding seat price
  validateFlatAmount(control: AbstractControl) {
    if (!control.value) return null;

    const pricePerSeat = this.flightForm.get('pricePerSeat')?.value;
    if (!pricePerSeat) return null;

    return control.value > pricePerSeat ? { exceedsPrice: true } : null;
  }

  addFareRule(): void {
    this.fareRules.push(this.createFareRuleGroup());
    // Validate the newly added rule
    this.revalidateFareRules();
  }

  removeFareRule(index: number): void {
    this.fareRules.removeAt(index);
  }

  revalidateFareRules(): void {
    if (this.fareRules.length === 0) return;

    // Force revalidation of all fare rules
    this.fareRules.controls.forEach((control) => {
      if (control.get('days')) {
        control.get('days')?.updateValueAndValidity();
      }
      if (control.get('amount')) {
        control.get('amount')?.updateValueAndValidity();
      }
    });
  }

  // Validator to ensure hold booking days doesn't exceed 30 days from departure date
  maxHoldBookingDaysValidator(maxDays: number) {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null;
      }

      const days = control.value;
      if (days > maxDays) {
        return { maxDaysExceeded: { value: control.value, max: maxDays } };
      }

      return null;
    };
  }

  maxHoldBookingLimitValidator() {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const hours = Number(control.value || 0);
      const days = Number(
        this.flightForm.get('holdBookingCutOffDays')?.value || 0
      );
      if (!isNaN(hours) && !isNaN(days) && days > 0 && hours > days * 24) {
        return { limitExceedsCutOff: true };
      }
      return null;
    };
  }

  // Display function for airport autocomplete
  displayAirport(airport: any): string {
    if (!airport) return '';
    if (typeof airport === 'string') return airport;
    return airport.code || '';
  }

  // Setup airport autocomplete functionality
  private setupAirportAutocomplete(
    flightGroup: FormGroup<any>,
    index: number,
    type: 'onward' | 'return'
  ) {
    if (!flightGroup) return;

    // Initialize arrays if needed
    if (!this.filteredFromAirports[index])
      this.filteredFromAirports[index] = of([]);
    if (!this.filteredToAirports[index])
      this.filteredToAirports[index] = of([]);
    if (!this.filteredReturnFromAirports[index])
      this.filteredReturnFromAirports[index] = of([]);
    if (!this.filteredReturnToAirports[index])
      this.filteredReturnToAirports[index] = of([]);

    // Setup From Airport autocomplete
    const fromControl = flightGroup.get('fromAirport');
    if (fromControl) {
      // Store the valid airport codes for validation
      let validFromAirports: string[] = [];

      if (type === 'onward') {
        this.filteredFromAirports[index] = fromControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) => this.airportService.searchAirports(value)),
          tap((airports) => {
            // Store valid airport codes for validation
            validFromAirports = airports.map((airport) => airport.code);
          })
        );
      } else {
        this.filteredReturnFromAirports[index] = fromControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) => this.airportService.searchAirports(value)),
          tap((airports) => {
            // Store valid airport codes for validation
            validFromAirports = airports.map((airport) => airport.code);
          })
        );
      }

      // Add value change event to validate selection and store ID
      fromControl.valueChanges.subscribe((value) => {
        if (value && typeof value === 'object' && value.id) {
          // Store the airport ID in the from_id field
          flightGroup.get('from_id')?.setValue(value.id);
        } else if (value && typeof value === 'string') {
          // Clear the airport ID if user is typing (not selecting from dropdown)
          flightGroup.get('from_id')?.setValue(null);
        }
      });
    }

    // Setup To Airport autocomplete
    const toControl = flightGroup.get('toAirport');
    if (toControl) {
      // Store the valid airport codes for validation
      let validToAirports: string[] = [];

      if (type === 'onward') {
        this.filteredToAirports[index] = toControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) => this.airportService.searchAirports(value)),
          tap((airports) => {
            // Store valid airport codes for validation
            validToAirports = airports.map((airport) => airport.code);
          })
        );
      } else {
        this.filteredReturnToAirports[index] = toControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => typeof value === 'string' && value.length >= 2),
          switchMap((value) => this.airportService.searchAirports(value)),
          tap((airports) => {
            // Store valid airport codes for validation
            validToAirports = airports.map((airport) => airport.code);
          })
        );
      }

      // Add value change event to validate selection and store ID
      toControl.valueChanges.subscribe((value) => {
        if (value && typeof value === 'object' && value.id) {
          // Store the airport ID in the to_id field
          flightGroup.get('to_id')?.setValue(value.id);
        } else if (value && typeof value === 'string') {
          // Clear the airport ID if user is typing (not selecting from dropdown)
          flightGroup.get('to_id')?.setValue(null);
        }
      });
    }
  }

  private setupTimeAutocomplete(
    flightGroup: FormGroup,
    index: number,
    type: 'onward' | 'return'
  ) {
    if (!flightGroup) return;
    const depCtrl = flightGroup.get('departureTime');
    const arrCtrl = flightGroup.get('arrivalTime');
    if (!depCtrl || !arrCtrl) return;

    const depStream = depCtrl.valueChanges.pipe(startWith(depCtrl.value || ''));
    const arrStream = arrCtrl.valueChanges.pipe(startWith(arrCtrl.value || ''));

    const categorize = (time: string): string => {
      const hour = parseInt((time || '00:00').split(':')[0], 10);
      if (hour < 5) return 'Night';
      if (hour < 12) return 'Morning';
      if (hour < 17) return 'Afternoon';
      if (hour < 21) return 'Evening';
      return 'Night';
    };

    const toGroups = (list: string[]) => {
      const groups: { [label: string]: string[] } = {};
      list.forEach((t) => {
        const label = categorize(t);
        if (!groups[label]) groups[label] = [];
        groups[label].push(t);
      });
      return Object.keys(groups).map((label) => ({
        label,
        items: groups[label]
      }));
    };

    const filterTimes = (q: string) => {
      const query = (q || '').toString().toLowerCase();
      const filtered = query
        ? this.timeSlots.filter((t) => t.toLowerCase().includes(query))
        : this.timeSlots;
      return toGroups(filtered);
    };

    const filterArrivalTimes = (q: string, depVal: string) => {
      const query = (q || '').toString().toLowerCase();
      const depIdx = this.timeSlots.indexOf(depVal || '');
      const base = depIdx >= 0 ? this.timeSlots.slice(depIdx) : this.timeSlots;
      const filtered = query
        ? base.filter((t) => t.toLowerCase().includes(query))
        : base;
      return toGroups(filtered);
    };

    if (type === 'onward') {
      this.filteredDepTimesOnward[index] = depStream.pipe(map(filterTimes));
      this.filteredArrTimesOnward[index] = combineLatest([
        arrStream,
        depStream
      ]).pipe(
        map(([arrQ, depVal]) =>
          filterArrivalTimes(arrQ as string, depVal as string)
        )
      );
    } else {
      this.filteredDepTimesReturn[index] = depStream.pipe(map(filterTimes));
      this.filteredArrTimesReturn[index] = combineLatest([
        arrStream,
        depStream
      ]).pipe(
        map(([arrQ, depVal]) =>
          filterArrivalTimes(arrQ as string, depVal as string)
        )
      );
    }
  }

  private getFlightGroup(type: 'onward' | 'return', index: number): FormGroup {
    return type === 'onward'
      ? (this.onwardFlights.at(index) as FormGroup)
      : (this.returnFlights.at(index) as FormGroup);
  }

  onTimeInput(
    type: 'onward' | 'return',
    index: number,
    controlName: 'departureTime' | 'arrivalTime',
    event: Event
  ): void {
    const group = this.getFlightGroup(type, index);
    const input = event.target as HTMLInputElement;
    let v = (input.value || '').toString();
    v = v.replace(/[^0-9]/g, '');
    v = v.substring(0, 4);
    let hh = v.substring(0, 2);
    let mm = v.substring(2, 4);
    if (hh.length === 2) {
      let h = Math.min(23, Math.max(0, parseInt(hh, 10) || 0));
      hh = h.toString().padStart(2, '0');
    }
    if (mm.length) {
      let m = Math.min(59, Math.max(0, parseInt(mm, 10) || 0));
      mm = m.toString().padStart(2, '0');
    }
    const formatted = mm.length
      ? `${hh}:${mm}`
      : hh.length === 2
        ? `${hh}:`
        : hh;
    input.value = formatted;
    group.get(controlName)?.setValue(formatted);
  }

  onTimeBlur(
    type: 'onward' | 'return',
    index: number,
    controlName: 'departureTime' | 'arrivalTime'
  ): void {
    const group = this.getFlightGroup(type, index);
    let val = (group.get(controlName)?.value || '').toString();
    const match = val.match(/^([0-9]{1,2}):?([0-9]{0,2})$/);
    if (!match) {
      group.get(controlName)?.setErrors({ pattern: true });
      return;
    }
    let h = Math.min(23, Math.max(0, parseInt(match[1], 10) || 0));
    let m = Math.min(59, Math.max(0, parseInt(match[2] || '0', 10) || 0));
    const fixed = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    group.get(controlName)?.setValue(fixed);
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(fixed)) {
      group.get(controlName)?.setErrors({ pattern: true });
    } else {
      group.get(controlName)?.setErrors(null);
    }
  }

  // Actions
  addOnwardFlight() {
    const newGroup = this.createFlightGroup();
    this.onwardFlights.push(newGroup);
    const index = this.onwardFlights.length - 1;
    this.setupAirportAutocomplete(newGroup, index, 'onward');
    this.setupAirlineAutocomplete(newGroup, index, 'onward');
    this.setupTimeAutocomplete(newGroup, index, 'onward');
  }
  removeOnwardFlight(i: number) {
    this.onwardFlights.removeAt(i);
  }

  addReturnFlight() {
    const newGroup = this.createFlightGroup();
    this.returnFlights.push(newGroup);
    const index = this.returnFlights.length - 1;
    this.setupAirportAutocomplete(newGroup, index, 'return');
    this.setupAirlineAutocomplete(newGroup, index, 'return');
    this.setupTimeAutocomplete(newGroup, index, 'return');
  }
  removeReturnFlight(i: number) {
    this.returnFlights.removeAt(i);
  }

  // Dummy API hook
  loadFlightData(
    flightNumber: string,
    type: 'onward' | 'return',
    index: number
  ) {
    console.log(`Load flight details for ${flightNumber} (${type} ${index})`);
    // here you can call an API and patchValue into this.onwardFlights.at(index)
  }

  // Helper function to format date as YYYY-MM-DD without timezone conversion
  formatDate(date: any): string {
    if (!date) return '';

    // If it's already a string in ISO format, extract just the date part
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0];
    }

    // Handle MM/DD/YYYY format (like 11/21/2025)
    if (typeof date === 'string' && date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3) {
        // Assuming MM/DD/YYYY format
        const month = String(parseInt(parts[0])).padStart(2, '0');
        const day = String(parseInt(parts[1])).padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Derive arrival_date if not provided: if arrivalTime < departureTime, next day; else same day
  private computeArrivalDate(f: any): string | null {
    if (f?.arrivalDate) {
      return this.formatDate(f.arrivalDate);
    }
    const depDateStr = this.formatDate(f?.departureDate);
    if (!depDateStr) return null;
    const depMinutes = this.parseTimeToMinutes(f?.departureTime);
    const arrMinutes = this.parseTimeToMinutes(f?.arrivalTime);
    if (depMinutes == null || arrMinutes == null) {
      return depDateStr; // default to same day if times missing
    }
    const base = new Date(`${depDateStr}T00:00:00`);
    if (arrMinutes < depMinutes) {
      base.setDate(base.getDate() + 1);
    }
    return this.formatDate(base);
  }

  private parseTimeToMinutes(t: string | null | undefined): number | null {
    if (!t || typeof t !== 'string') return null;
    const parts = t.split(':');
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  submit() {
    if (this.flightForm.valid) {
      const formValue = this.flightForm.value;
      //  console.log(formValue.onwardFlights[0]);
      // Main flight date = first onward flight departure
      const mainFlightDate = formValue.onwardFlights[0]?.departureDate || null;

      // Validate if flight date is at least equal to the booking/naming cut-off days from current date
      const flightDate = new Date(mainFlightDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation

      // Calculate days difference
      const diffTime = flightDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Get the maximum of booking and naming cut-off days
      const maxCutOffDays = Math.max(
        formValue.bookingCutOff,
        formValue.namingCutOff
      );

      if (diffDays < maxCutOffDays) {
        this._snackBar.open(
          `Invalid flight date. The flight date must be at least ${maxCutOffDays} days from today based on your cut-off settings.`,
          'Close',
          {
            duration: 5000,
            panelClass: ['error-snackbar']
          }
        );
        return;
      }

      const getCode = (v: any) =>
        typeof v === 'object' ? v.code || v.name : v;
      const origin = getCode(formValue.onwardFlights[0]?.fromAirport);
      const finalDest = getCode(
        formValue.onwardFlights[formValue.onwardFlights.length - 1]?.toAirport
      );
      const sectorStr =
        formValue.hasReturn &&
        formValue.returnFlights &&
        formValue.returnFlights.length > 0
          ? `${origin}-${finalDest}-${origin}`
          : `${origin}-${finalDest}`;

      const payload = {
        flight_date: this.formatDate(mainFlightDate),
        sector: sectorStr,
        pnr: formValue.onwardFlights[0]?.pnrNumber || null,
        available_for_sale: true,
        booking_cut_off_days: formValue.bookingCutOff,
        naming_cut_off_days: formValue.namingCutOff,
        seat_allocated: formValue.availableSeats,
        seat_booked: 0,
        seat_blocked: 0,
        markup: 0,
        amount: formValue.pricePerSeat,
        sell_price: formValue.pricePerSeat,
        infant_price: formValue.infantPrice || 0,
        is_active: true,
        is_refundable: formValue.isRefundable === 'refundable',
        fare_rules:
          formValue.isRefundable === 'refundable'
            ? formValue.fareRules.map((rule: any) => ({
                days_before_departure: rule.days,
                refundable_amount: rule.amount
              }))
            : [],
        meal_option: formValue.mealOption,
        seat_option: formValue.seatOption,
        special_tag: formValue.specialTag,
        allow_tba_user: formValue.allowTbaUser,
        allow_hold_booking: formValue.allowHoldBooking || false,
        hold_type: formValue.allowHoldBooking
          ? formValue.holdBookingType === 'percentage'
            ? 'P'
            : 'F'
          : null,
        hold_value: formValue.allowHoldBooking
          ? formValue.holdBookingAmount
          : null,
        hold_booking_days: formValue.allowHoldBooking
          ? formValue.holdBookingCutOffDays
          : null,
        hold_booking_limit: formValue.allowHoldBooking
          ? formValue.holdBookingLimit
          : null,

        // Flag to indicate presence of return flight details
        is_return: !!(
          formValue.hasReturn &&
          formValue.returnFlights &&
          formValue.returnFlights.length > 0
        ),

        // Legs (Onward + Return) with their own departureDate
        details: [
          ...formValue.onwardFlights.map((f: any) => ({
            flight_date: this.formatDate(f.departureDate), // added here
            baggage_weight: f.baggage,
            cabin_baggage: f.cabinBaggage,
            flight_number: f.flightNumber,
            terminal: f.terminal,
            dep_terminal: f.terminal || null,
            arr_terminal: f.arrivalTerminal || null,
            pnr_number: f.pnrNumber || null,
            type: 'Onward',
            from:
              typeof f.fromAirport === 'object'
                ? f.fromAirport.code
                : f.fromAirport,
            to:
              typeof f.toAirport === 'object' ? f.toAirport.code : f.toAirport,
            from_id: f.from_id, // Added airport ID
            to_id: f.to_id, // Added airport ID
            airline_id: f.airline_id, // Added airline ID
            airline: f.airline, // Added airline name
            dep_time: f.departureTime,
            arr_time: f.arrivalTime,
            arrival_date: this.computeArrivalDate(f),
            is_active: true
          })),
          ...(formValue.hasReturn
            ? formValue.returnFlights.map((f: any) => ({
                flight_date: this.formatDate(f.departureDate), // added here
                baggage_weight: f.baggage,
                cabin_baggage: f.cabinBaggage,
                flight_number: f.flightNumber,
                terminal: f.terminal,
                dep_terminal: f.terminal || null,
                arr_terminal: f.arrivalTerminal || null,
                pnr_number: f.pnrNumber || null,
                type: 'Return',
                from:
                  typeof f.fromAirport === 'object'
                    ? f.fromAirport.code
                    : f.fromAirport,
                to:
                  typeof f.toAirport === 'object'
                    ? f.toAirport.code
                    : f.toAirport,
                from_id: f.from_id, // Added airport ID
                to_id: f.to_id, // Added airport ID
                airline_id: f.airline_id, // Added airline ID
                airline: f.airline, // Added airline name
                dep_time: f.departureTime,
                arr_time: f.arrivalTime,
                arrival_date: this.computeArrivalDate(f),
                is_active: true
              }))
            : [])
        ]
      };

      console.log('Submitting Payload:', payload);

      this.dialog
        .open(AddFlightInventoryPreviewDialogComponent, {
          width: '900px',
          data: payload
        })
        .afterClosed()
        .subscribe((result) => {
          if (result === 'confirm') {
            this.submitting = true;
            this.flightService.createFlightInventory(payload).subscribe({
              next: (res) => {
                this.submitting = false;
                console.log('API Response:', res);
                alert('Flight inventory created successfully!');
                this.flightForm.reset();
              },
              error: (err) => {
                this.submitting = false;
                console.error('API Error:', err);
                alert('Something went wrong. Check console.');
              }
            });
          }
        });
    } else {
      console.log('Form invalid');
      this.flightForm.markAllAsTouched();
    }
  }

  onDatesSelected(dates: Date[]) {
    console.log('Selected dates:', dates);
    this.flightForm.patchValue({ seriesDates: dates });
  }

  preventNegativeInput(event: KeyboardEvent) {
    // Prevent minus sign, plus sign, and 'e' (scientific notation)
    if (
      event.key === '-' ||
      event.key === '+' ||
      event.key === 'e' ||
      event.key === 'E'
    ) {
      event.preventDefault();
    }
  }
}
