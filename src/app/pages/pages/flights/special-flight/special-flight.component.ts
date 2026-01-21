import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import {
  startWith,
  map,
  debounceTime,
  distinctUntilChanged,
  switchMap
} from 'rxjs/operators';
import { FormControl as NgFormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SpecialFlightService } from '../../../../services/special-flight.service';
import { FlightInventoryService } from '../../../../services/flight-inventory.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'vex-special-flight',
  templateUrl: './special-flight.component.html',
  styleUrls: ['./special-flight.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .mat-calendar-body-disabled > .mat-calendar-body-cell-content {
        text-decoration: line-through !important;
        color: rgba(0, 0, 0, 0.38) !important;
      }

      .travellers-field {
        position: relative;
      }

      .travellers-popup {
        position: absolute;
        top: 60px;
        right: 0;
        width: 300px;
        background: white;
        border-radius: 4px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        padding: 16px;
      }

      @media (max-width: 768px) {
        .travellers-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 320px;
          right: auto;
        }
      }

      .traveller-type {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 8px 0;
      }

      .traveller-title {
        font-weight: 500;
      }

      .traveller-controls {
        display: flex;
        align-items: center;
      }

      .traveller-count {
        margin: 0 12px;
        min-width: 24px;
        text-align: center;
        font-weight: 500;
      }

      .traveller-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
        padding-top: 8px;
        border-top: 1px solid #eee;
      }
    `
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatRadioModule,
    MatCardModule,
    MatTooltipModule,
    HttpClientModule
  ]
})
export class SpecialFlightComponent implements OnInit {
  // Form field labels
  formLabels = {
    from: 'From (Origin)',
    to: 'To (Destination)',
    departDate: 'Departure Date',
    returnDate: 'Return Date',
    travellers: 'Passengers'
  };

  form = new FormGroup({
    from: new FormControl(''),
    to: new FormControl(''),
    tripType: new FormControl<'oneway' | 'roundtrip'>('oneway'),
    departDate: new FormControl<Date | null>(null), // Departure date is blank by default
    returnDate: new FormControl<Date | null>(null), // Return date is blank by default
    travellers: new FormControl('1 adult'),
    adults: new FormControl(1),
    children: new FormControl(0),
    infants: new FormControl(0)
  });

  // Store available dates
  availableDates: string[] = [];
  // Allowed return dates when a paired date exists for roundtrip
  allowedReturnDates: string[] = [];
  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const dateString = this.formatDate(date);
    return this.availableDates.includes(dateString);
  };
  // Dedicated filter for return date to restrict selection to paired date(s)
  returnDateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const dateString = this.formatDate(date);
    // If we have an allowed list, restrict to it; otherwise allow all dates
    return (
      this.allowedReturnDates.length === 0 ||
      this.allowedReturnDates.includes(dateString)
    );
  };

  loading = false;
  error = '';
  totalFlights = 0;

  // Airport data will be fetched from API
  airports: any[] = [];

  filteredFrom$: Observable<any[]>;
  filteredTo$: Observable<any[]>;

  travellersOptions = ['1 adult', '2 adults', '3 adults', '1 adult, 1 child'];

  // Flight groups will be populated from API
  flightGroups: any[] = [];
  filteredFlightGroups: any[] = [];

  // Track which flight groups have expanded fare details
  expandedFares: { [key: string]: boolean } = {};

  // Travellers dropdown state
  openTravellersDropdown = false;

  departureSlots = new Set<string>();
  arrivalSlots = new Set<string>();

  // Getter methods for form controls to avoid null checks in template
  get adultsCount(): number {
    return this.form.get('adults')?.value || 1;
  }

  get childrenCount(): number {
    return this.form.get('children')?.value || 0;
  }

  get infantsCount(): number {
    return this.form.get('infants')?.value || 0;
  }

  getTravellersDropdownPosition(): number {
    // Position the dropdown below the travellers field
    return 60;
  }

  // Define interface for flight response structure
  flightResponse: {
    flights: any[];
    total: number;
  } | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private specialFlightService: SpecialFlightService,
    private flightService: FlightInventoryService,
    private dialog: MatDialog
  ) {
    // cast to Angular FormControl for correct typing
    const fromCtrl = this.form.get('from') as NgFormControl;
    const toCtrl = this.form.get('to') as NgFormControl;

    // Setup auto-search for From field
    this.filteredFrom$ = fromCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        const query = typeof value === 'string' ? value : '';
        return query.length >= 2
          ? this.flightService.getAirlineAirports(query).pipe(
              map((response) => {
                console.log('response from api', response);
                return response && response.data ? response.data : [];
              })
            )
          : [];
      })
    );

    // Setup auto-search for To field
    this.filteredTo$ = toCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        const query = typeof value === 'string' ? value : '';
        return query.length >= 2
          ? this.flightService.getAirlineAirports(query).pipe(
              map((response) => {
                return response && response.data ? response.data : [];
              })
            )
          : [];
      })
    );
  }

  ngOnInit() {
    // Show a single alert when user selects One Way or Round Trip
    this.form.get('tripType')?.valueChanges.subscribe((val) => {
      // Inform the user of the selection
      //alert(val === 'roundtrip' ? 'Round Trip selected' : 'One Way selected');

      // Update URL to retain only current tripType and clear other params
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          tripType: val,
          from: null,
          to: null,
          departDate: null,
          returnDate: null,
          travellers: null,
          adults: null,
          children: null,
          infants: null
        },
        replaceUrl: true
      });

      // Reset filter fields without firing valueChanges to avoid API calls
      this.form.get('from')?.setValue('', { emitEvent: false });
      this.form.get('to')?.setValue('', { emitEvent: false });
      this.form.get('departDate')?.setValue(null, { emitEvent: false });
      this.form.get('returnDate')?.setValue(null, { emitEvent: false });

      // Clear any date restrictions and search results state
      this.availableDates = [];
      this.allowedReturnDates = [];
      this.flightGroups = [];
      this.totalFlights = 0;
      this.loading = false;
      this.error = '';
    });
    this.form.get('departDate')?.valueChanges.subscribe((departVal) => {
      const tripType = this.form.value.tripType || 'oneway';
      // Debug: log change context to verify API trigger conditions
      console.log('departDate changed:', {
        departVal,
        tripType,
        fromCode: this.getFromCode(),
        toCode: this.getToCode()
      });
      // Clear previous allowed return selection
      this.allowedReturnDates = [];
      // If not roundtrip, just clear return date and exit
      if (tripType !== 'roundtrip') {
        this.form.get('returnDate')?.setValue(null);
        return;
      }

      const fromCode = this.getFromCode();
      const toCode = this.getToCode();
      if (!departVal || !fromCode || !toCode) {
        this.form.get('returnDate')?.setValue(null);
        return;
      }

      const departDateStr = this.formatDate(departVal as Date);
      this.flightService
        .getPairedReturnDate(fromCode, toCode, departDateStr)
        .subscribe({
          next: (resp) => {
            if (resp && resp.success && resp.returnDate) {
              const rd: string = resp.returnDate;
              this.allowedReturnDates = [rd];
              const rdDate = new Date(rd);
              this.form.get('returnDate')?.setValue(rdDate);
              // Reflect selection in URL for deep-linking
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { returnDate: rd },
                queryParamsHandling: 'merge'
              });
            } else {
              // No paired return date found; keep return date empty and allow none
              this.form.get('returnDate')?.setValue(null);
            }
          },
          error: (err) => {
            console.error('Error fetching paired return date', err);
            this.form.get('returnDate')?.setValue(null);
          }
        });
    });
    // Set up listeners for from and to fields to fetch available dates
    this.form.get('from')?.valueChanges.subscribe((fromValue) => {
      this.checkAndFetchAvailableDates();
    });

    this.form.get('to')?.valueChanges.subscribe((toValue) => {
      this.checkAndFetchAvailableDates();
    });

    // Get parameters from URL if they exist
    this.route.queryParams.subscribe((params) => {
      if (Object.keys(params).length > 0) {
        // Ensure trip type reflects URL first so downstream date logic behaves correctly
        // Suppress valueChanges to avoid triggering alert on initial load
        if (params['tripType']) {
          const tt = (params['tripType'] as string).toLowerCase();
          this.form
            .get('tripType')
            ?.setValue(tt === 'roundtrip' ? 'roundtrip' : 'oneway', {
              emitEvent: false
            });
        }
        // Track loading of URL parameters
        let fromLoaded = !params['from'];
        let toLoaded = !params['to'];

        // Update form with URL parameters
        if (params['from']) {
          // For airport codes, create a proper airport object
          const fromCodeParam = (params['from'] as string).toUpperCase();
          const currentFromVal = this.form.get('from')?.value;
          const currentFromCode =
            typeof currentFromVal === 'object' && currentFromVal
              ? (
                  (currentFromVal as any).code ||
                  (currentFromVal as any).iata ||
                  ''
                ).toUpperCase()
              : typeof currentFromVal === 'string'
                ? (currentFromVal as string).toUpperCase()
                : '';

          // Skip refetch if the same code is already selected
          if (currentFromCode === fromCodeParam) {
            fromLoaded = true;
          } else {
            this.flightService
              .getAirlineAirports(fromCodeParam)
              .subscribe((response) => {
                if (response && response.data && response.data.length > 0) {
                  // Find exact match for the airport code
                  const exactMatch = response.data.find(
                    (airport: any) =>
                      airport.code?.toUpperCase() === fromCodeParam ||
                      airport.iata?.toUpperCase() === fromCodeParam
                  );

                  if (exactMatch) {
                    this.form.get('from')?.setValue(exactMatch);
                  } else {
                    // If no exact match, use the first result
                    this.form.get('from')?.setValue(response.data[0]);
                  }
                } else {
                  // Fallback to just setting the code as string
                  this.form.get('from')?.setValue(fromCodeParam);
                }

                fromLoaded = true;
                this.checkAndSearchFlights(fromLoaded, toLoaded, params);
              });
          }
        }

        if (params['to']) {
          // For airport codes, create a proper airport object
          const toCodeParam = (params['to'] as string).toUpperCase();
          const currentToVal = this.form.get('to')?.value;
          const currentToCode =
            typeof currentToVal === 'object' && currentToVal
              ? (
                  (currentToVal as any).code ||
                  (currentToVal as any).iata ||
                  ''
                ).toUpperCase()
              : typeof currentToVal === 'string'
                ? (currentToVal as string).toUpperCase()
                : '';

          // Skip refetch if the same code is already selected
          if (currentToCode === toCodeParam) {
            toLoaded = true;
          } else {
            this.flightService
              .getAirlineAirports(toCodeParam)
              .subscribe((response) => {
                if (response && response.data && response.data.length > 0) {
                  // Find exact match for the airport code
                  const exactMatch = response.data.find(
                    (airport: any) =>
                      airport.code?.toUpperCase() === toCodeParam ||
                      airport.iata?.toUpperCase() === toCodeParam
                  );

                  if (exactMatch) {
                    this.form.get('to')?.setValue(exactMatch);
                  } else {
                    // If no exact match, use the first result
                    this.form.get('to')?.setValue(response.data[0]);
                  }
                } else {
                  // Fallback to just setting the code as string
                  this.form.get('to')?.setValue(toCodeParam);
                }

                toLoaded = true;
                this.checkAndSearchFlights(fromLoaded, toLoaded, params);
              });
          }
        }

        if (params['departDate']) {
          // Parse the date string and ensure it's properly formatted
          const dateStr = params['departDate'];
          console.log('Parsing departDate from URL:', dateStr);

          // Try different date parsing approaches
          let departDateParam;

          // First try direct Date constructor
          departDateParam = new Date(dateStr);

          // If that fails, try manual parsing for YYYY-MM-DD format
          if (isNaN(departDateParam.getTime())) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              // Note: month is 0-indexed in JavaScript Date
              departDateParam = new Date(
                parseInt(parts[0], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[2], 10)
              );
            }
          }

          console.log('Parsed departDate:', departDateParam);

          if (!isNaN(departDateParam.getTime())) {
            this.form.get('departDate')?.setValue(departDateParam);
            console.log('departDate set in form:', departDateParam);
          } else {
            console.error('Failed to parse departDate:', dateStr);
          }
        }

        if (params['returnDate']) {
          // Parse the return date string using the same approach as departDate
          const dateStr = params['returnDate'];
          console.log('Parsing returnDate from URL:', dateStr);

          // Try different date parsing approaches
          let returnDateParam;

          // First try direct Date constructor
          returnDateParam = new Date(dateStr);

          // If that fails, try manual parsing for YYYY-MM-DD format
          if (isNaN(returnDateParam.getTime())) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              // Note: month is 0-indexed in JavaScript Date
              returnDateParam = new Date(
                parseInt(parts[0], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[2], 10)
              );
            }
          }

          if (!isNaN(returnDateParam.getTime())) {
            this.form.get('returnDate')?.setValue(returnDateParam);
            console.log('returnDate set in form:', returnDateParam);
          } else {
            console.error('Failed to parse returnDate:', dateStr);
          }
        }

        if (params['travellers'])
          this.form.get('travellers')?.setValue(params['travellers']);

        // Handle adults, children, and infants parameters
        if (params['adults']) {
          const adultsValue = parseInt(params['adults'], 10);
          if (!isNaN(adultsValue)) {
            this.form.get('adults')?.setValue(adultsValue);
          }
        }

        if (params['children']) {
          const childrenValue = parseInt(params['children'], 10);
          if (!isNaN(childrenValue)) {
            this.form.get('children')?.setValue(childrenValue);
          }
        }

        if (params['infants']) {
          const infantsValue = parseInt(params['infants'], 10);
          if (!isNaN(infantsValue)) {
            this.form.get('infants')?.setValue(infantsValue);
          }
        }

        if (params['departSlots']) {
          const ds = String(params['departSlots'])
            .split(',')
            .filter((x) => !!x);
          this.departureSlots = new Set(ds);
        }
        if (params['arrivalSlots']) {
          const as = String(params['arrivalSlots'])
            .split(',')
            .filter((x) => !!x);
          this.arrivalSlots = new Set(as);
        }

        // If there are no from/to params or they're already loaded, search flights immediately
        this.checkAndSearchFlights(fromLoaded, toLoaded, params);
      } else {
        // No URL parameters, just search with default values
        this.searchFlights();
      }
    });
  }

  // Check if both from and to are selected, then fetch available dates
  checkAndFetchAvailableDates() {
    const fromValue = this.form.get('from')?.value;
    const toValue = this.form.get('to')?.value;

    console.log('checkAndFetchAvailableDates called', { fromValue, toValue });

    // Check if values are objects with code property
    if (
      fromValue &&
      toValue &&
      typeof fromValue === 'object' &&
      fromValue !== null &&
      'code' in fromValue &&
      typeof toValue === 'object' &&
      toValue !== null &&
      'code' in toValue
    ) {
      console.log(
        'Fetching available dates for',
        (fromValue as { code: string }).code,
        (toValue as { code: string }).code
      );
      // Use type assertion to tell TypeScript these objects have a code property
      this.fetchAvailableDates(
        (fromValue as { code: string }).code,
        (toValue as { code: string }).code
      );
    } else {
      console.log('Conditions not met for fetching dates');
    }
  }

  // Fetch available dates from API
  fetchAvailableDates(from: string, to: string) {
    const tripType = this.form.value.tripType || 'oneway';
    console.log(
      '%cCalling API: %c/airports/available-dates %c(tripType: ' +
        tripType +
        ')',
      'color: black;',
      'color: #e91e63; font-weight: bold;',
      'color: black;'
    );
    this.flightService
      .getAvailableDates(from, to, tripType as string)
      .subscribe({
        next: (response) => {
          console.log(
            '%cAPI Response from %c/airports/available-dates%c:',
            'color: black;',
            'color: #e91e63; font-weight: bold;',
            'color: black;',
            response
          );
          if (response && response.success && response.data) {
            this.availableDates = response.data;

            // Don't reset date fields if they already have values from URL parameters
            const currentDepartDate = this.form.get('departDate')?.value;
            const currentReturnDate = this.form.get('returnDate')?.value;

            console.log('Current form dates before potential reset:', {
              departDate: currentDepartDate,
              returnDate: currentReturnDate
            });

            // Auto-set the first available date if departure date is empty and dates are available
            if (!currentDepartDate && this.availableDates.length > 0) {
              const firstAvailableDate = new Date(this.availableDates[0]);
              this.form.get('departDate')?.setValue(firstAvailableDate);
              console.log(
                'Auto-set departure date to first available date:',
                firstAvailableDate
              );
            }

            // Only reset return date if no value is present
            if (!currentReturnDate) {
              this.form.get('returnDate')?.setValue(null);
            }
          } else {
            this.availableDates = [];
          }
        },
        error: (error) => {
          console.error(
            '%cError fetching available dates from %c/airports/available-dates%c:',
            'color: black;',
            'color: #e91e63; font-weight: bold;',
            'color: black;',
            error
          );
          this.availableDates = [];
        }
      });
  }

  /**
   * Checks if all required URL parameters are loaded and then searches for flights
   * @param fromLoaded Whether the 'from' airport data is loaded
   * @param toLoaded Whether the 'to' airport data is loaded
   * @param params The URL query parameters
   */
  checkAndSearchFlights(fromLoaded: boolean, toLoaded: boolean, params: any) {
    // Only search when both from and to are loaded (if they were in the URL)
    if (fromLoaded && toLoaded) {
      console.log('All URL parameters loaded, searching flights');
      this.searchFlights();
    } else {
      console.log('Waiting for all URL parameters to load before searching');
    }
  }

  searchFlights() {
    this.loading = true;
    this.error = '';
    this.flightGroups = [];
    this.filteredFlightGroups = [];

    const params: any = {};

    // Only add parameters if they have values
    const fromValue = this.form.value.from;
    if (fromValue) {
      // Handle both object and string values
      if (
        typeof fromValue === 'object' &&
        fromValue !== null &&
        'code' in fromValue
      ) {
        // Use type assertion to tell TypeScript this object has a code property
        params.from = (fromValue as { code: string }).code;
      } else if (typeof fromValue === 'string' && fromValue.trim() !== '') {
        params.from = fromValue.trim();
      }
    }

    const toValue = this.form.value.to;
    if (toValue) {
      // Handle both object and string values
      if (
        typeof toValue === 'object' &&
        toValue !== null &&
        'code' in toValue
      ) {
        // Use type assertion to tell TypeScript this object has a code property
        params.to = (toValue as { code: string }).code;
      } else if (typeof toValue === 'string' && toValue.trim() !== '') {
        params.to = toValue.trim();
      }
    }

    if (this.form.value.departDate) {
      params.departDate = this.formatDate(this.form.value.departDate);
    }

    // Always include tripType for backend filtering
    params.tripType =
      this.form.value.tripType === 'roundtrip' ? 'roundtrip' : 'oneway';

    if (
      this.form.value.tripType === 'roundtrip' &&
      this.form.value.returnDate
    ) {
      params.returnDate = this.formatDate(this.form.value.returnDate);
    }

    // Add individual traveller counts instead of combined travellers string
    if (this.form.value.adults) {
      params.adults = this.form.value.adults;
    }

    if (this.form.value.children && this.form.value.children > 0) {
      params.children = this.form.value.children;
    }

    if (this.form.value.infants && this.form.value.infants > 0) {
      params.infants = this.form.value.infants;
    }

    if (this.departureSlots.size > 0) {
      params.departSlots = Array.from(this.departureSlots).join(',');
    }
    if (this.arrivalSlots.size > 0) {
      params.arrivalSlots = Array.from(this.arrivalSlots).join(',');
    }

    const qp: any = { ...params };
    qp.departSlots =
      this.departureSlots.size > 0
        ? Array.from(this.departureSlots).join(',')
        : null;
    qp.arrivalSlots =
      this.arrivalSlots.size > 0
        ? Array.from(this.arrivalSlots).join(',')
        : null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
      replaceUrl: false
    });

    // Only call API if from, to, and departDate fields are provided
    if (params.from && params.to && params.departDate) {
      this.specialFlightService.getSpecialFlights(params).subscribe({
        next: (response: any) => {
          this.loading = false;
          console.log('API Response:', response);

          // Check if response is successful and has flights
          if (response && response.success && response.flights) {
            this.flightGroups = response.flights;

            // Process each flight group to prepare for display
            this.flightGroups.forEach((group) => {
              // Set initial state for fare display
              group.showMoreFares = false;
              group.showDetails = false;

              // Sort fare options by price (lowest first)
              if (group.fareOptions) {
                group.fareOptions.sort((a: any, b: any) => a.price - b.price);
              }

              // Process connecting flight segments using details from top-level or first fare option
              const details =
                (group.flight_inventory_details &&
                group.flight_inventory_details.length
                  ? group.flight_inventory_details
                  : group.fareOptions && group.fareOptions.length > 0
                    ? group.fareOptions[0].flight_inventory_details
                    : []) || [];

              if (details && details.length > 0) {
                // Combined segments for backward compatibility
                group.segments = details.map((detail: any) => {
                  const dep = detail.dep_time || detail.departure_time;
                  const arr = detail.arr_time || detail.arrival_time;
                  return {
                    flightCode: detail.flight_number,
                    from: detail.from,
                    to: detail.to,
                    airline: detail.airline || '',
                    departureTime: dep,
                    arrivalTime: arr,
                    flightDate: detail.flight_date,
                    arrivalDate: detail.arrival_date || detail.flight_date,
                    flightDateLabel: this.formatDateDMY(detail.flight_date),
                    arrivalDateLabel: this.formatDateDMY(
                      detail.arrival_date || detail.flight_date
                    ),
                    type: detail.type || '',
                    duration: this.computeDuration(dep, arr),
                    fromCity: detail.from_city || '',
                    toCity: detail.to_city || '',
                    depTerminal: detail.dep_terminal || detail.terminal || '',
                    arrTerminal: detail.arr_terminal || ''
                  };
                });

                // Split segments by type for clearer display
                group.onwardSegments = group.segments.filter(
                  (s: any) => (s.type || '').toLowerCase() === 'onward'
                );
                group.returnSegments = group.segments.filter(
                  (s: any) => (s.type || '').toLowerCase() === 'return'
                );

                // Aggregate flight numbers for display
                group.onwardFlightNumbers = (group.onwardSegments || [])
                  .map((s: any) => s.flightCode)
                  .filter((code: any) => !!code)
                  .join(', ');
                group.returnFlightNumbers = (group.returnSegments || [])
                  .map((s: any) => s.flightCode)
                  .filter((code: any) => !!code)
                  .join(', ');

                // Update stops information (combined)
                group.stops = `${group.segments.length > 0 ? group.segments.length - 1 : 0} Stop${group.segments.length > 2 ? 's' : ''}`;

                // Derive header fields similar to target design
                const firstSeg = group.segments[0];
                const lastSeg = group.segments[group.segments.length - 1];
                group.departureTime =
                  firstSeg?.departureTime || group.departureTime;
                group.arrivalTime = lastSeg?.arrivalTime || group.arrivalTime;
                group.departureCity =
                  firstSeg?.fromCity || firstSeg?.from || group.departureCity;
                group.arrivalCity =
                  lastSeg?.toCity || lastSeg?.to || group.arrivalCity;
                group.depTerminal = firstSeg?.depTerminal || '';
                group.arrTerminal = lastSeg?.arrTerminal || '';
                group.departDateLabel = firstSeg?.flightDateLabel || '';
                group.arrivalDateLabel = lastSeg?.arrivalDateLabel || '';
                group.airlineName =
                  firstSeg?.airline ||
                  (group.fareOptions?.[0]?.flight_inventory?.airline ?? '');
                group.firstFlightCode = firstSeg?.flightCode || '';
                const vias = (group.segments || [])
                  .slice(1, Math.max(1, (group.segments || []).length - 1))
                  .map((s: any) => s.toCity || s.to)
                  .filter((v: any) => !!v);
                group.viaText = vias.length ? `via ${vias.join(', ')}` : '';
              }
            });

            this.totalFlights = response.total || this.flightGroups.length;
            console.log('Flights loaded:', this.flightGroups);

            // Clear any previous error
            this.error = '';
            this.applyFilters();
          } else if (
            response &&
            response.success &&
            response.flights &&
            response.flights.length === 0
          ) {
            // API returned successfully but no flights found
            this.flightGroups = [];
            this.filteredFlightGroups = [];
            this.totalFlights = 0;
            this.error = '';
            console.log('No flights found for the selected criteria');
          } else {
            // API returned but with error or unexpected structure
            this.flightGroups = [];
            this.filteredFlightGroups = [];
            this.totalFlights = 0;
            this.error =
              response?.message ||
              'No flights found. Please try different search criteria.';
            console.error('API response error:', response);
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = 'Failed to load flights. Please try again.';
          console.error('Error loading flights:', err);
        }
      });
    } else {
      // If from, to, and departDate are not all provided, don't call API and reset loading state
      this.loading = false;
      this.flightGroups = [];
      this.filteredFlightGroups = [];
      this.totalFlights = 0;
      console.log('Missing required fields for API call:', {
        from: !!params.from,
        to: !!params.to,
        departDate: !!params.departDate
      });
    }
  }

  toggleDepartureSlot(slot: string) {
    if (this.departureSlots.has(slot)) {
      this.departureSlots.delete(slot);
    } else {
      this.departureSlots.add(slot);
    }
    this.searchFlights();
  }

  toggleArrivalSlot(slot: string) {
    if (this.arrivalSlots.has(slot)) {
      this.arrivalSlots.delete(slot);
    } else {
      this.arrivalSlots.add(slot);
    }
    this.searchFlights();
  }

  isDepartureSlotSelected(slot: string): boolean {
    return this.departureSlots.has(slot);
  }

  isArrivalSlotSelected(slot: string): boolean {
    return this.arrivalSlots.has(slot);
  }

  private toMinutes(time?: string): number | null {
    if (!time) return null;
    const parts = time.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  private isTimeInSlot(time?: string, slot?: string): boolean {
    if (!time || !slot) return false;
    const mins = this.toMinutes(time);
    if (mins === null) return false;
    if (slot === '05-12') return mins >= 5 * 60 && mins < 12 * 60;
    if (slot === '12-18') return mins >= 12 * 60 && mins < 18 * 60;
    if (slot === '18-24') return mins >= 18 * 60 && mins < 24 * 60;
    if (slot === '24-05') return mins >= 0 && mins < 5 * 60;
    return false;
  }

  private applyFilters() {
    const depActive = this.departureSlots.size > 0;
    const arrActive = this.arrivalSlots.size > 0;
    if (!depActive && !arrActive) {
      this.filteredFlightGroups = [...this.flightGroups];
      return;
    }
    const depSlots = Array.from(this.departureSlots);
    const arrSlots = Array.from(this.arrivalSlots);
    this.filteredFlightGroups = (this.flightGroups || []).filter((g: any) => {
      let depOk = true;
      let arrOk = true;
      if (depActive) {
        depOk = depSlots.some((s) => this.isTimeInSlot(g?.departureTime, s));
      }
      if (arrActive) {
        arrOk = arrSlots.some((s) => this.isTimeInSlot(g?.arrivalTime, s));
      }
      return depOk && arrOk;
    });
  }

  /**
   * Compute duration between two HH:mm:ss times
   */
  private computeDuration(depTime?: string, arrTime?: string): string {
    if (!depTime || !arrTime) return '';
    const [dh, dm] = depTime.split(':').map((x) => parseInt(x, 10));
    const [ah, am] = arrTime.split(':').map((x) => parseInt(x, 10));
    if ([dh, dm, ah, am].some((n) => isNaN(n))) return '';
    // Convert to minutes, simple same-day assumption; overnight handled elsewhere by dates
    let depMin = dh * 60 + dm;
    let arrMin = ah * 60 + am;
    if (arrMin < depMin) {
      // Overnight arrival; add 24h
      arrMin += 24 * 60;
    }
    const mins = arrMin - depMin;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  /**
   * Format a date string (YYYY-MM-DD) to "d mmm yyyy" (e.g., 2 nov 2025)
   */
  private formatDateDMY(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const d = parseInt(day, 10);
    const mIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec'
    ];
    return `${isNaN(d) ? day : d} ${months[mIdx]} ${year}`;
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Update travellers count and update the travellers display
   */
  updateTravellers(
    type: 'adults' | 'children' | 'infants',
    change: number
  ): void {
    const currentValue = this.form.get(type)?.value || 0;
    const newValue = currentValue + change;

    // Apply limits
    if (type === 'adults' && (newValue < 1 || newValue > 9)) return;
    if (type === 'children' && (newValue < 0 || newValue > 4)) return;
    if (type === 'infants' && (newValue < 0 || newValue > 2)) return;

    this.form.get(type)?.setValue(newValue);

    // Update the travellers display string
    this.updateTravellersDisplay();
  }

  /**
   * Update the travellers form control with a formatted string
   */
  updateTravellersDisplay(): void {
    const adults = this.form.get('adults')?.value || 0;
    const children = this.form.get('children')?.value || 0;
    const infants = this.form.get('infants')?.value || 0;

    let travellersText = '';

    if (adults === 1) {
      travellersText = '1 adult';
    } else if (adults > 1) {
      travellersText = `${adults} adults`;
    }

    if (children === 1) {
      travellersText += travellersText ? ', 1 child' : '1 child';
    } else if (children > 1) {
      travellersText += travellersText
        ? `, ${children} children`
        : `${children} children`;
    }

    if (infants === 1) {
      travellersText += travellersText ? ', 1 infant' : '1 infant';
    } else if (infants > 1) {
      travellersText += travellersText
        ? `, ${infants} infants`
        : `${infants} infants`;
    }

    this.form.get('travellers')?.setValue(travellersText);
  }

  /**
   * Get the travellers display string
   */
  getTravellersDisplay(): string {
    return this.form.get('travellers')?.value || '1 adult';
  }

  // Original sample result (keeping for reference)
  flightResult = {
    airline: 'Akasa Air',
    flightNo: 'QP-1102',
    departDate: new Date(2025, 8, 17),
    departTime: '10:00',
    arriveTime: '11:30',
    duration: '1h 30m',
    from: 'Ahmedabad',
    to: 'Mumbai',
    price: 2500,
    seatsLeft: 1,
    bagAllowances: { checkin: '15 KG', cabin: '7 KG' },
    airlineLogo: 'https://picsum.photos/200' // change to your path or URL
  };

  // Display only airport code in uppercase in input after selection
  displayAirport(airport: any): string {
    return airport ? `${airport.code.toUpperCase()}` : '';
  }

  swap() {
    const f = this.form.value.from;
    const t = this.form.value.to;
    this.form.patchValue({ from: t, to: f });
  }

  // prevDay method moved to avoid duplication

  // nextDay method moved to avoid duplication

  /**
   * Toggle the visibility of additional fare options for a flight group
   * @param group The flight group to toggle expanded fares for
   */

  onSearch() {
    const formValue = this.form.value;

    if (!formValue.from || !formValue.to) {
      this.error = 'Please select both origin and destination airports';
      return;
    }

    // Delegate to the unified search logic so both submit and URL-load follow the same path
    this.searchFlights();
  }

  prevDay() {
    const current = this.form.controls['departDate'].value as
      | Date
      | null
      | undefined;
    const d = new Date(current ?? new Date()); // safe: if current is null/undefined, use now
    d.setDate(d.getDate() - 1);
    this.form.controls['departDate'].setValue(d);
    this.searchFlights(); // Refresh search with new date
  }

  nextDay() {
    const current = this.form.controls['departDate'].value as
      | Date
      | null
      | undefined;
    const d = new Date(current ?? new Date());
    d.setDate(d.getDate() + 1);
    this.form.controls['departDate'].setValue(d);
    this.searchFlights(); // Refresh search with new date
  }

  toggleMoreFares(group: any) {
    group.showMoreFares = !group.showMoreFares;
  }

  toggleDetails(group: any) {
    group.showDetails = !group.showDetails;
  }

  holdNow(group: any, fare: any, fareId: any) {
    const freezePayload: any = { seats: 1, flight_id: fareId, type: 'flight' };
    this.flightService.freezeSeats(freezePayload).subscribe({
      next: () => alert('Hold initiated successfully'),
      error: () => alert('Failed to hold. Please try again')
    });
  }

  openDetails(group: any, fare: any) {
    import(
      './flight-details-dialog/special-flight-details-dialog.component'
    ).then((m) => {
      const adults = Number(this.form.get('adults')?.value || 1);
      const children = Number(this.form.get('children')?.value || 0);
      const infants = Number(this.form.get('infants')?.value || 0);
      this.dialog.open(m.SpecialFlightDetailsDialogComponent, {
        width: '900px',
        data: { group, fare, adults, children, infants }
      });
    });
  }

  bookNow(group: any, fare: any, fareId: any) {
    // Get the flight inventory ID from the group object with fallback
    const inventoryIdRaw = group?.inventoryId || group?.id || '0';
    const inventoryId = Number(inventoryIdRaw) || 0;

    // Ensure fareId is not undefined
    const safeFareId = fareId || '0';
    const isExternal = !Number.isFinite(Number(safeFareId));

    // Get passengers count from the search form
    const adults = this.form.get('adults')?.value || 1;
    const children = this.form.get('children')?.value || 0;
    const infants = this.form.get('infants')?.value || 0;
    const requestedSeats = Number(adults) + Number(children) + Number(infants);

    console.log('Booking flight:', group);
    console.log('Selected fare:', fare);
    console.log('Adults:', adults, 'Children:', children, 'Infants:', infants);

    const sectyp =
      (Array.isArray(group?.flight_inventory_details) &&
        group.flight_inventory_details[0]?.sectyp) ||
      (Array.isArray(fare?.flight_inventory_details) &&
        fare.flight_inventory_details[0]?.sectyp) ||
      null;

    // Guard: ensure enough seats are available in the selected fare
    const seatsLeft = fare?.seats ?? null;
    if (seatsLeft !== null && requestedSeats > seatsLeft) {
      alert(
        `Not enough seats left. Requested ${requestedSeats}, available ${seatsLeft}.`
      );
      return;
    }

    // Only freeze seats for internal inventory
    const freezePayload: any = {
      seats: requestedSeats,
      flight_id: fareId,
      type: 'flight'
    };
    if (!isExternal && (group?.type || 'internal') === 'internal') {
      console.log(
        'Freezing seats at:',
        new Date().toLocaleString(),
        freezePayload
      );
      this.flightService.freezeSeats(freezePayload).subscribe({
        next: (response: any) => {
          console.log(
            'Seats frozen response:',
            response,
            'at',
            new Date().toLocaleString()
          );
          const data = response?.data ?? response ?? {};
          const freezeInfo = data?.freeze ?? {};
          const freezeId = freezeInfo?.freeze_id ?? null;
          const expiresAt = freezeInfo?.expires_at ?? null;
          const seatsFrozen = data?.seats_frozen ?? requestedSeats;
          const seatsRemaining = data?.seats_remaining ?? null;
          const seatBlocked = data?.seat_blocked ?? null;

          const fareDetailsToStore = {
            ...fare,
            rmkey: Array.isArray((fare as any)?.rmkey)
              ? (fare as any).rmkey
              : typeof (fare as any)?.rmkey === 'string' && (fare as any).rmkey
                ? [(fare as any).rmkey]
                : Array.isArray((fare as any)?.rmk)
                  ? (fare as any).rmk
                  : []
          };

          const bookingData = {
            flightId: safeFareId,
            fareId: safeFareId,
            flightDetails: group,
            fareDetails: fareDetailsToStore,
            type: 'internal',
            sectyp: sectyp,
            farePrice: fare?.price_with_tax ?? fare?.price ?? null,
            adults: adults,
            children: children,
            infants: infants,
            freeze: {
              inventoryId,
              flightId: inventoryId,
              freezeId,
              seats: seatsFrozen,
              expiresAt,
              seatsRemaining,
              seatBlocked
            },
            timestamp: new Date().getTime()
          };

          localStorage.setItem(
            'specialBookingData',
            JSON.stringify(bookingData)
          );
          this.router.navigate(['/flights/special-booking', safeFareId]);
        },
        error: (err: any) => {
          console.error('Failed to freeze seats:', err);
          const available = err?.error?.data?.available ?? null;
          const requested = err?.error?.data?.requested ?? requestedSeats;
          if (available !== null) {
            alert(
              `Not enough seats available. Requested ${requested}, available ${available}.`
            );
          } else {
            alert(
              'Failed to reserve seats. Please try again or choose another fare.'
            );
          }
        }
      });
    } else {
      // External: skip freeze, store booking and navigate
      const fareDetailsToStore = {
        ...fare,
        rmkey: Array.isArray((fare as any)?.rmkey)
          ? (fare as any).rmkey
          : typeof (fare as any)?.rmkey === 'string' && (fare as any).rmkey
            ? [(fare as any).rmkey]
            : Array.isArray((fare as any)?.rmk)
              ? (fare as any).rmk
              : []
      };

      const bookingData = {
        flightId: safeFareId,
        fareId: safeFareId,
        flightDetails: group,
        fareDetails: fareDetailsToStore,
        type: 'external',
        sectyp: sectyp,
        farePrice: fare?.price ?? fare?.price ?? null,
        adults: adults,
        children: children,
        infants: infants,
        freeze: {
          inventoryId,
          flightId: inventoryId,
          freezeId: null,
          seats: requestedSeats,
          expiresAt: null,
          seatsRemaining: null,
          seatBlocked: null
        },
        timestamp: new Date().getTime()
      };
      localStorage.setItem('specialBookingData', JSON.stringify(bookingData));
      this.router.navigate(['/flights/special-booking', safeFareId]);
    }
  }

  /**
   * Get the 'From' airport code for display
   */
  getFromCode(): string {
    const fromValue = this.form.value.from;
    if (typeof fromValue === 'object' && fromValue !== null) {
      const obj = fromValue as { code?: string; iata?: string };
      if (obj.code && obj.code.trim() !== '') {
        return obj.code.trim().toUpperCase();
      }
      if (obj.iata && obj.iata.trim() !== '') {
        return obj.iata.trim().toUpperCase();
      }
    } else if (typeof fromValue === 'string' && fromValue.trim() !== '') {
      return fromValue.trim().toUpperCase();
    }
    return '';
  }

  /**
   * Get the 'To' airport code for display
   */
  getToCode(): string {
    const toValue = this.form.value.to;
    if (typeof toValue === 'object' && toValue !== null) {
      const obj = toValue as { code?: string; iata?: string };
      if (obj.code && obj.code.trim() !== '') {
        return obj.code.trim().toUpperCase();
      }
      if (obj.iata && obj.iata.trim() !== '') {
        return obj.iata.trim().toUpperCase();
      }
    } else if (typeof toValue === 'string' && toValue.trim() !== '') {
      return toValue.trim().toUpperCase();
    }
    return '';
  }
}
