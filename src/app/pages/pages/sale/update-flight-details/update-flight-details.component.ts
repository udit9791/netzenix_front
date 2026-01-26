import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FlightInventoryService } from '../../../../services/flight-inventory.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { AirlineService } from '../../../../services/airline.service';
import { Observable, map, startWith, tap } from 'rxjs';

export class UpdateFlightDateAdapter extends NativeDateAdapter {
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

export const UPDATE_FLIGHT_DATE_FORMATS = {
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
  selector: 'app-update-flight-details',
  templateUrl: './update-flight-details.component.html',
  styleUrls: ['./update-flight-details.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatIconModule,
    MatAutocompleteModule
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: UpdateFlightDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: UPDATE_FLIGHT_DATE_FORMATS }
  ]
})
export class UpdateFlightDetailsComponent implements OnInit {
  flightForm: FormGroup;
  flightData: any;
  timeSlots: string[] = [];
  hasReturnFlightAvailable: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  airlines: any[] = [];
  filteredAirlines: Observable<any[]>[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private flightService: FlightInventoryService,
    private airlineService: AirlineService,
    private cd: ChangeDetectorRef
  ) {
    this.flightForm = this.fb.group({
      departureDate: ['', Validators.required],
      onwardFlights: this.fb.array([this.createOnwardFlight()]),
      hasReturn: [false],
      returnFlights: this.fb.array([]),
      pnr: [''],
      pnrStatus: ['onTime'],
      pricePerSeat: [null, [Validators.required, Validators.min(0)]],
      infantPrice: [null, Validators.min(0)],
      allowTbaUser: [false],
      updateSameFlightDetails: [true],
      updateInInventoryTill: [''],
      updateAndNotify: [true],
      message: ['']
    });
  }

  ngOnInit() {
    this.generateTimeSlots();

    // Get flight ID from route params and fetch flight details
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        const flightId = params['id'];

        // First load airlines, then fetch flight details
        this.airlineService.getAirlines().subscribe({
          next: (airlinesResponse) => {
            this.airlines = airlinesResponse.data;

            // Now fetch flight details
            this.flightService.getFlightById(flightId).subscribe({
              next: (response) => {
                this.flightData = response;
                this.populateForm();
                // Check if return flights are available
                this.checkReturnFlightAvailability();
              },
              error: (error) => {
                console.error('Error fetching flight details:', error);
              }
            });
          },
          error: (error) => {
            console.error('Error loading airlines:', error);
          }
        });
      }
    });
  }

  loadAirlines() {
    return this.airlineService.getAirlines().pipe(
      tap((response) => {
        this.airlines = response.data;
        this.initializeFilteredAirlines();
      })
    );
  }

  initializeFilteredAirlines() {
    // Initialize for onward flights
    for (let i = 0; i < this.onwardFlights.length; i++) {
      this.setupAirlineAutocomplete(i, 'onward');
    }

    // Initialize for return flights
    for (let i = 0; i < this.returnFlights.length; i++) {
      this.setupAirlineAutocomplete(i, 'return');
    }
  }

  setupAirlineAutocomplete(index: number, flightType: 'onward' | 'return') {
    const formArray =
      flightType === 'onward' ? this.onwardFlights : this.returnFlights;
    const control = formArray.at(index);

    if (control) {
      const airlineCodeControl = control.get('airlineCode');
      const airlineIdControl = control.get('airline_id');
      const airlineNameControl = control.get('airline');

      if (airlineCodeControl) {
        // If we have an airline_id, find the corresponding airline object
        const airlineId = airlineIdControl?.value;
        let initialValue = '';

        if (airlineId && this.airlines.length > 0) {
          // Find the airline by ID
          const airline = this.airlines.find(
            (a) => a.id.toString() === airlineId
          );
          if (airline) {
            // Set the airline code control to the found airline object
            airlineCodeControl.setValue(airline);
            // Set the airline name for display purposes
            airlineNameControl?.setValue(airline.name);
            // Force the display to update with the full airline info
            setTimeout(() => {
              airlineCodeControl.updateValueAndValidity();
            }, 100);
            initialValue = airline;
          }
        }

        const filteredAirlines = airlineCodeControl.valueChanges.pipe(
          startWith(initialValue),
          map((value) => this._filterAirlines(value || ''))
        );

        // Store the observable in the array using a consistent indexing approach
        const arrayIndex =
          flightType === 'onward' ? index : index + this.onwardFlights.length;
        this.filteredAirlines[arrayIndex] = filteredAirlines;
      }
    }
  }

  private _filterAirlines(value: any): any[] {
    // If value is an object (airline already selected), return empty array
    if (typeof value === 'object' && value !== null) {
      return [];
    }

    // Handle string values for filtering
    const filterValue = typeof value === 'string' ? value.toLowerCase() : '';
    return this.airlines.filter(
      (airline) =>
        airline &&
        airline.code &&
        airline.name &&
        (airline.code.toLowerCase().includes(filterValue) ||
          airline.name.toLowerCase().includes(filterValue))
    );
  }

  displayAirline(airline: any): string {
    if (!airline) return '';
    if (typeof airline === 'string') return airline;
    return airline && airline.code && airline.name
      ? `${airline.code} - ${airline.name}`
      : '';
  }

  updateFlightNumber(
    event: any,
    index: number,
    flightType: 'onward' | 'return'
  ) {
    // Enhanced validation for event object
    if (!event) {
      console.error('Event is null or undefined in updateFlightNumber');
      return;
    }

    // Handle MatOptionSelectionChange event structure
    let airline;

    // Check if event is MatOptionSelectionChange
    if (event.source && event.isUserInput) {
      // MatOptionSelectionChange structure
      airline = event.source.value;
    } else if (event.option) {
      // Previous expected structure
      airline = event.option.value;
    } else {
      console.error('Invalid event structure in updateFlightNumber', event);
      return;
    }

    // Debug log to check airline object
    console.log('Selected airline object:', airline);

    // Check if airline exists and is an object
    if (!airline || typeof airline !== 'object') {
      console.error('No airline selected or invalid airline object', airline);
      return;
    }

    const formArray =
      flightType === 'onward' ? this.onwardFlights : this.returnFlights;

    // Check if formArray exists and has the index
    if (!formArray || index < 0 || index >= formArray.length) {
      console.error('Invalid form array or index', {
        flightType,
        index,
        length: formArray?.length
      });
      return;
    }

    const flightGroup = formArray.at(index);

    // Check if flightGroup exists
    if (!flightGroup) {
      console.error('Flight group not found at index', index);
      return;
    }

    // Check if airline has required properties
    if (!airline.code || !airline.name || !airline.id) {
      console.error('Airline missing required properties', airline);
      return;
    }

    const airlineCode = airline.code;
    const airlineName = airline.name;
    const airlineId = airline.id.toString();

    // Set airline object for the dropdown display
    flightGroup.get('airlineCode')?.setValue(airline);

    // Set airline name and ID for API submission - ensure these are set properly
    flightGroup.get('airline')?.setValue(airlineName);
    flightGroup.get('airline_id')?.setValue(airlineId);

    // Force update the form controls to ensure values are set
    this.cd.detectChanges();

    // Clear flight number and set it to airline code immediately
    flightGroup.get('flightNumber')?.setValue(airlineCode);

    // Log the form values to verify
    console.log('Form values after update:', {
      airline_id: flightGroup.get('airline_id')?.value,
      airline: flightGroup.get('airline')?.value,
      airlineCode: flightGroup.get('airlineCode')?.value,
      flightNumber: flightGroup.get('flightNumber')?.value
    });

    console.log('Updated airline values:', {
      airline_id: airlineId,
      airline: airlineName,
      airlineCode: airline,
      flightNumber: airlineCode
    });
  }

  generateTimeSlots() {
    // Generate time slots in 30-minute intervals (00:00 to 23:30)
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }

    // Add specific time values from our data (02:31 and 03:23)
    slots.push('02:31');
    slots.push('03:23');

    // Sort the slots to maintain chronological order
    slots.sort();

    this.timeSlots = slots;
  }

  get onwardFlights() {
    return this.flightForm.get('onwardFlights') as FormArray;
  }

  get returnFlights() {
    return this.flightForm.get('returnFlights') as FormArray;
  }

  createOnwardFlight() {
    const group = this.fb.group({
      departureDate: ['', Validators.required],
      arrivalDate: [''],
      flightNumber: ['', Validators.required],
      pnrNumber: [''],
      airlineCode: [''],
      airline: [''],
      airline_id: [''],
      fromAirport: ['', Validators.required],
      toAirport: ['', Validators.required],
      departureTime: ['', Validators.required],
      arrivalTime: ['', Validators.required],
      baggage: [''],
      cabinBaggage: [''],
      terminal: [''],
      depTerminal: [''],
      arrTerminal: ['']
    });

    // Listen for departure time changes to filter arrival times
    group.get('departureTime')?.valueChanges.subscribe((time) => {
      if (time) {
        this.updateArrivalTimeOptions(group, time);
      }
    });

    return group;
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

  createReturnFlight() {
    const group = this.fb.group({
      departureDate: ['', Validators.required],
      arrivalDate: [''],
      flightNumber: ['', Validators.required],
      pnrNumber: [''],
      airlineCode: [''],
      airline: [''],
      airline_id: [''],
      fromAirport: ['', Validators.required],
      toAirport: ['', Validators.required],
      departureTime: ['', Validators.required],
      arrivalTime: ['', Validators.required],
      baggage: [''],
      cabinBaggage: [''],
      terminal: [''],
      depTerminal: [''],
      arrTerminal: ['']
    });

    // Listen for departure time changes to filter arrival times
    group.get('departureTime')?.valueChanges.subscribe((time) => {
      if (time) {
        this.updateArrivalTimeOptions(group, time);
      }
    });

    return group;
  }

  addOnwardFlight() {
    this.onwardFlights.push(this.createOnwardFlight());
  }

  addReturnFlight() {
    this.returnFlights.push(this.createReturnFlight());
  }

  removeOnwardFlight(index: number) {
    this.onwardFlights.removeAt(index);
  }

  removeReturnFlight(index: number) {
    this.returnFlights.removeAt(index);
  }

  toggleReturnFlight() {
    const hasReturn = this.flightForm.get('hasReturn')?.value;
    if (hasReturn && this.returnFlights.length === 0) {
      this.addReturnFlight();
    } else if (!hasReturn) {
      while (this.returnFlights.length !== 0) {
        this.returnFlights.removeAt(0);
      }
    }
  }

  checkReturnFlightAvailability() {
    // Check if there are return flights in the data
    if (this.flightData && this.flightData.details) {
      const returnFlights = this.flightData.details.filter(
        (detail: any) => detail.type === 'Return' || detail.type === 'return'
      );
      this.hasReturnFlightAvailable = returnFlights.length > 0;
    } else {
      this.hasReturnFlightAvailable = false;
    }
  }

  populateForm() {
    if (this.flightData) {
      // Ensure time slots are generated before populating form
      this.generateTimeSlots();

      // Set basic flight details
      this.flightForm.patchValue({
        departureDate: this.flightData.flight_date || '',
        pnr: this.flightData.pnr || '',
        pnrStatus: this.flightData.pnr_status || 'onTime',
        pricePerSeat:
          this.flightData.sell_price ?? this.flightData.amount ?? null,
        infantPrice: this.flightData.infant_price ?? null,
        allowTbaUser: this.flightData.allow_tba_user || false,
        updateSameFlightDetails: true,
        updateInInventoryTill: this.flightData.flight_date || '',
        updateAndNotify: true
      });

      // Clear existing onward flights
      while (this.onwardFlights.length !== 0) {
        this.onwardFlights.removeAt(0);
      }

      // Define interface for flight detail
      interface FlightDetail {
        id: number;
        flight_inventory_id: number;
        baggage_weight: string | null;
        flight_number: string;
        type: string;
        from: string;
        to: string;
        dep_time: string;
        arr_time: string;
        is_active: number;
        arrival_date?: string;
        flight_date?: string;
        pnr?: string;
        dep_terminal?: string;
        arr_terminal?: string;
        created_by: number | null;
        updated_by: number | null;
        deleted_by: number | null;
        deleted_at: string | null;
        created_at: string;
        updated_at: string;
        cabin_baggage?: string | null;
        terminal?: string | null;
        airline?: string | null;
        airline_id?: string | null;
      }

      // Process onward flights from details array
      const onwardFlightDetails = this.flightData.details?.filter(
        (detail: FlightDetail) => detail.type === 'Onward'
      );
      if (onwardFlightDetails && onwardFlightDetails.length > 0) {
        onwardFlightDetails.forEach((detail: FlightDetail) => {
          const onwardFlight = this.createOnwardFlight();

          // Ensure we have default values for all fields
          const cabinBaggage = detail.cabin_baggage || '';
          const terminal = detail.terminal || '';

          // Format time values to match the format in the dropdown (HH:MM)
          const departureTime = detail.dep_time
            ? detail.dep_time.substring(0, 5)
            : '';
          const arrivalTime = detail.arr_time
            ? detail.arr_time.substring(0, 5)
            : '';

          // Ensure these times exist in the timeSlots array
          if (departureTime && !this.timeSlots.includes(departureTime)) {
            this.timeSlots.push(departureTime);
            this.timeSlots.sort();
          }

          if (arrivalTime && !this.timeSlots.includes(arrivalTime)) {
            this.timeSlots.push(arrivalTime);
            this.timeSlots.sort();
          }

          onwardFlight.patchValue({
            departureDate:
              detail.flight_date || this.flightData.flight_date || '',
            arrivalDate: detail.arrival_date || detail.flight_date || '',
            flightNumber: detail.flight_number || '',
            pnrNumber: detail.pnr || this.flightData.pnr || '',
            fromAirport: detail.from || '',
            toAirport: detail.to || '',
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            baggage: detail.baggage_weight || '',
            cabinBaggage: cabinBaggage,
            terminal: terminal,
            depTerminal: detail.dep_terminal || '',
            arrTerminal: detail.arr_terminal || '',
            airline: detail.airline || '',
            airline_id: detail.airline_id || '',
            airlineCode: detail.flight_number?.substring(0, 2) || ''
          });
          this.onwardFlights.push(onwardFlight);
          // Setup airline autocomplete for this flight
          this.setupAirlineAutocomplete(
            this.onwardFlights.length - 1,
            'onward'
          );
        });
      }

      // Process return flights from details array
      const returnFlightDetails = this.flightData.details?.filter(
        (detail: FlightDetail) => detail.type === 'Return'
      );
      if (returnFlightDetails && returnFlightDetails.length > 0) {
        this.flightForm.patchValue({ hasReturn: true });

        returnFlightDetails.forEach((detail: FlightDetail) => {
          const returnFlight = this.createReturnFlight();

          // Ensure we have default values for all fields
          const cabinBaggage = detail.cabin_baggage || '';
          const terminal = detail.terminal || '';

          // Format time values to match the format in the dropdown (HH:MM)
          const departureTime = detail.dep_time
            ? detail.dep_time.substring(0, 5)
            : '';
          const arrivalTime = detail.arr_time
            ? detail.arr_time.substring(0, 5)
            : '';

          // Ensure these times exist in the timeSlots array
          if (departureTime && !this.timeSlots.includes(departureTime)) {
            this.timeSlots.push(departureTime);
            this.timeSlots.sort();
          }

          if (arrivalTime && !this.timeSlots.includes(arrivalTime)) {
            this.timeSlots.push(arrivalTime);
            this.timeSlots.sort();
          }

          returnFlight.patchValue({
            departureDate: detail.flight_date || '',
            arrivalDate: detail.arrival_date || detail.flight_date || '',
            flightNumber: detail.flight_number || '',
            pnrNumber: detail.pnr || this.flightData.pnr || '',
            fromAirport: detail.from || '',
            toAirport: detail.to || '',
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            baggage: detail.baggage_weight || '',
            cabinBaggage: cabinBaggage,
            terminal: terminal,
            depTerminal: detail.dep_terminal || '',
            arrTerminal: detail.arr_terminal || '',
            airline: detail.airline || '',
            airline_id: detail.airline_id || '',
            airlineCode: detail.flight_number?.substring(0, 2) || ''
          });
          this.returnFlights.push(returnFlight);
          // Setup airline autocomplete for this flight
          this.setupAirlineAutocomplete(
            this.returnFlights.length - 1,
            'return'
          );
        });
      }
    }
  }

  submit() {
    if (this.flightForm.valid) {
      // Define flight detail interface
      interface FlightDetail {
        type: string;
        flight_number: string;
        from: string;
        to: string;
        dep_time: string;
        arr_time: string;
        baggage_weight: string;
        cabin_baggage: string;
        terminal: string;
        airline_id: string;
        airline: string;
        pnr_number: string | null;
        dep_terminal: string | null;
        arr_terminal: string | null;
        flight_date: string | null;
        arrival_date: string | null;
      }

      // Prepare payload for API
      const formData = this.flightForm.value;

      // Calculate sector from first onward flight (origin) to last destination
      let sector = '';
      if (formData.onwardFlights && formData.onwardFlights.length > 0) {
        const firstFlight = formData.onwardFlights[0];
        let lastFlight;

        // If there are return flights, use the last return flight's destination
        if (
          formData.hasReturn &&
          formData.returnFlights &&
          formData.returnFlights.length > 0
        ) {
          lastFlight =
            formData.returnFlights[formData.returnFlights.length - 1];
        } else {
          // Otherwise use the last onward flight's destination
          lastFlight =
            formData.onwardFlights[formData.onwardFlights.length - 1];
        }

        // Create sector string
        sector = `${firstFlight.fromAirport}-${lastFlight.toAirport}`;
      }

      // Format date to prevent timezone issues (YYYY-MM-DD format)
      const formatDate = (dateString: any): string => {
        if (!dateString) return '';

        // Check if dateString is a string before using includes
        if (typeof dateString === 'string' && dateString.includes('T')) {
          return dateString.split('T')[0];
        }

        try {
          // Get the date without timezone conversion
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');

          // Format as YYYY-MM-DD
          const formattedDate = `${year}-${month}-${day}`;

          // Return the actual formatted date without any hardcoded replacements
          return formattedDate;
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      const payload: {
        flight_date: string;
        pnr: string;
        pnr_status: string;
        sector: string;
        allow_tba_user: boolean;
        sell_price?: number;
        amount?: number;
        infant_price?: number;
        details: FlightDetail[];
      } = {
        // Use the first onward flight's departure date for the main flight_date
        flight_date:
          formData.onwardFlights.length > 0
            ? formatDate(formData.onwardFlights[0].departureDate)
            : formatDate(formData.departureDate),
        pnr: formData.pnr,
        pnr_status: formData.pnrStatus,
        sector: sector,
        allow_tba_user: formData.allowTbaUser,
        sell_price: formData.pricePerSeat ?? null,
        amount: formData.pricePerSeat ?? null,
        infant_price: formData.infantPrice ?? null,
        details: []
      };

      // Define flight interface
      interface FlightFormData {
        flightNumber: string;
        fromAirport: string;
        toAirport: string;
        departureTime: string;
        arrivalTime: string;
        baggage: string;
        cabinBaggage: string;
        terminal: string;
        departureDate: string;
        arrivalDate: string;
        pnrNumber: string;
        depTerminal: string;
        arrTerminal: string;
        airlineCode: string;
        airline: string;
        airline_id: string;
      }

      // Add onward flights to details
      formData.onwardFlights.forEach(
        (flight: FlightFormData, index: number) => {
          // Use the flight's own departure date
          const flightDate = formatDate(flight.departureDate);
          payload.details.push({
            type: 'Onward',
            flight_number: flight.flightNumber,
            from: flight.fromAirport,
            to: flight.toAirport,
            dep_time: flight.departureTime,
            arr_time: flight.arrivalTime,
            baggage_weight: flight.baggage,
            cabin_baggage: flight.cabinBaggage,
            terminal: flight.terminal,
            airline_id: flight.airline_id,
            airline: flight.airline,
            pnr_number: flight.pnrNumber || null,
            dep_terminal: flight.depTerminal || null,
            arr_terminal: flight.arrTerminal || null,
            flight_date: flightDate,
            arrival_date: flight.arrivalDate
              ? formatDate(flight.arrivalDate)
              : null
          });
        }
      );

      // Add return flights to details if hasReturn is true
      if (formData.hasReturn) {
        formData.returnFlights.forEach(
          (flight: FlightFormData, index: number) => {
            // Use the flight's own departure date
            const flightDate = formatDate(flight.departureDate);
            payload.details.push({
              type: 'Return',
              flight_number: flight.flightNumber,
              from: flight.fromAirport,
              to: flight.toAirport,
              dep_time: flight.departureTime,
              arr_time: flight.arrivalTime,
              baggage_weight: flight.baggage,
              cabin_baggage: flight.cabinBaggage,
              terminal: flight.terminal,
              airline_id: flight.airline_id,
              airline: flight.airline,
              pnr_number: flight.pnrNumber || null,
              dep_terminal: flight.depTerminal || null,
              arr_terminal: flight.arrTerminal || null,
              flight_date: flightDate,
              arrival_date: flight.arrivalDate
                ? formatDate(flight.arrivalDate)
                : null
            });
          }
        );
      }

      // Call API to update flight inventory
      this.flightService
        .updateFlightInventory(this.flightData.id, payload)
        .subscribe({
          next: (response) => {
            console.log('Flight updated successfully:', response);
            this.successMessage = 'Flight details updated successfully!';
            this.errorMessage = '';
          },
          error: (error) => {
            console.error('Error updating flight:', error);
            this.errorMessage =
              'Failed to update flight details. Please try again.';
            this.successMessage = '';
          }
        });
    } else {
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.flightForm);
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
