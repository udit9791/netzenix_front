import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormControl,
  Validators,
  FormBuilder,
  FormArray,
  ValidatorFn
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { SpecialFlightService } from '../../../../services/special-flight.service';
import { FlightInventoryService } from '../../../../services/flight-inventory.service';
import { HttpClient } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
// Using relative paths for services
import { FlightService } from '../../../../services/flight.service';
import { UserService } from '../../../../services/user.service';
import { OrderService } from '../../../../services/order.service';
import { ToastrService } from 'ngx-toastr';
import { TravelerDetailsDialog } from './traveler-details-dialog';

@Component({
  selector: 'app-special-flight-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './special-flight-booking.component.html',
  styleUrls: ['./special-flight-booking.component.scss']
})
export class SpecialFlightBookingComponent implements OnInit {
  // Form controls
  mobileNumberControl = new FormControl('');
  travelerForms: FormGroup[] = [];
  travelers: { type: string; index: number }[] = [];
  isInternational = false;
  private dialogPatchedIndices: {
    Adult: number[];
    Child: number[];
    Infant: number[];
  } = {
    Adult: [],
    Child: [],
    Infant: []
  };
  showVerificationModal = false;

  contactForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    agentRef: new FormControl('')
  });

  couponCode = new FormControl('');
  flightId: string | null = null;
  fareId: string | null = null;
  isLoading = false;

  // Price calculation properties
  baseFareAdult = 0; // Default to match API response
  baseFareChild = 0; // Default to match API response
  baseFareInfant = 0; // Default to match API response
  countries: any[] = [];

  // Service fees and commission breakdown
  serviceFee = 0;
  serviceFeesgst = 0;
  serviceFeecgst = 0;
  commission = 0;
  tdsonCommission = 0;
  discount = 0;
  userId = 0; // Will be set from logged-in user
  isSameState = false; // Flag to indicate if user is in same state as company
  bookingType: 'internal' | 'external' = 'internal';
  externalUkey: string | null = null;
  externalRmkey: string[] = [];

  booking: {
    totalPrice: number;
    travelDate: Date;
    adults: number;
    children: number;
    infants: number;
    cabin: string;
    checkin: string;
    mobileNumber: string;
    flights: any[];
    flightInventoryData: any;
    [key: string]: any; // Allow string indexing
  } = {
    totalPrice: 4550,
    travelDate: new Date(2023, 9, 16),
    adults: 1,
    children: 0,
    infants: 0,
    cabin: 'Economy',
    checkin: '15 KG',
    mobileNumber: '',
    flights: [] as any[], // Changed from single flight to flights array
    flightInventoryData: null as any // Store the complete API response
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private specialFlightService: SpecialFlightService,
    private flightInventoryService: FlightInventoryService,
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private flightService: FlightService,
    private userService: UserService,
    private orderService: OrderService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.userService.getPublicCountries().subscribe({
      next: (resp: any) => {
        this.countries = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp)
            ? resp
            : [];
      },
      error: () => {
        this.countries = [];
      }
    });
    // Try to get data from localStorage first
    const localData = localStorage.getItem('specialBookingData');

    console.log(localData);
    let flightDetails = null;
    let fareDetails = null;
    let flightId = null;

    // Get user data from localStorage and populate contact form
    this.populateContactFormFromLocalStorage();
    let fareId = null;
    let type: 'internal' | 'external' = 'internal';
    let farePrice: number | null = null;
    let adults = 1;
    let children = 0;
    let infants = 0;

    // Get the current logged-in user ID and then fetch commission data
    this.getCurrentUserId().then(() => {
      // Fetch commission data for the current user after userId is set
      this.fetchCommissionData();
      // Calculate fare charges after user data is loaded
      if (this.flightId) {
        this.calculateFareCharges();
      }
    });

    if (localData) {
      try {
        const bookingData = JSON.parse(localData);
        flightDetails = bookingData.flightDetails;
        fareDetails = bookingData.fareDetails;
        flightId = bookingData.flightId;
        fareId = bookingData.fareId;
        type = bookingData.type === 'external' ? 'external' : 'internal';
        this.bookingType = type;
        if (this.bookingType === 'external') {
          const fd: any = fareDetails || {};
          const ukey =
            typeof fd.id === 'string' ? fd.id : String(this.fareId || '');
          const rmkeyArr = Array.isArray(fd.rmk)
            ? fd.rmk
            : typeof fd.rmkey === 'string' && fd.rmkey
              ? [fd.rmkey]
              : Array.isArray(fd.rmkey)
                ? fd.rmkey
                : [];
          this.externalUkey = ukey || null;
          this.externalRmkey = rmkeyArr;
        }
        farePrice =
          typeof bookingData.farePrice === 'number'
            ? bookingData.farePrice
            : fareDetails?.price ?? null;
        adults = bookingData.adults || 1;
        children = bookingData.children || 0;
        infants = bookingData.infants || 0;
        console.log('Retrieved from localStorage:', bookingData);
      } catch (error) {
        console.error('Error parsing localStorage data:', error);
      }
    }

    // Fallback to route parameters if localStorage is empty
    if (!flightId) {
      this.flightId = this.route.snapshot.paramMap.get('id');
      this.fareId = this.route.snapshot.paramMap.get('fareId');
      adults = Number(this.route.snapshot.paramMap.get('adults') || 1);
      children = Number(this.route.snapshot.paramMap.get('children') || 0);
      infants = Number(this.route.snapshot.paramMap.get('infants') || 0);
    } else {
      this.flightId = flightId;
      this.fareId = fareId;
    }

    console.log('Booking parameters:', {
      flightId: this.flightId,
      fareId: this.fareId,
      adults: adults,
      children: children,
      infants: infants
    });

    // Update booking with passenger count
    this.booking.adults = adults;
    this.booking.children = children;
    this.booking.infants = infants;

    // Generate traveler forms based on passenger counts
    this.generateTravelerForms(adults, children, infants);

    // Update total price based on passenger counts
    this.booking.totalPrice = this.calculateTotalPrice();

    const isExternalType = type === 'external';
    if (isExternalType) {
      const ukey =
        fareDetails && typeof fareDetails.id === 'string'
          ? fareDetails.id
          : String(this.fareId || '');
      const rmkey = Array.isArray((fareDetails as any)?.rmkey)
        ? (fareDetails as any).rmkey
        : typeof (fareDetails as any)?.rmkey === 'string' &&
            (fareDetails as any).rmkey
          ? [(fareDetails as any).rmkey]
          : [];
      const sectyp =
        (Array.isArray((flightDetails as any)?.flight_inventory_details) &&
          (flightDetails as any).flight_inventory_details[0]?.sectyp) ||
        (Array.isArray((fareDetails as any)?.flight_inventory_details) &&
          (fareDetails as any).flight_inventory_details[0]?.sectyp) ||
        null;
      if (ukey) {
        this.specialFlightService
          .checkExternalAvailability({ ukey, rmkey, sectyp })
          .subscribe({
            next: (resp) => {
              console.log('External availability:', resp);
              const flightData = resp?.data ?? resp ?? null;
              if (flightData) {
                this.updateInternationalFlagFromInventory(flightData);
                // Store normalized inventory and build flights using processFlightDetail
                this.booking.flightInventoryData = flightData;
                this.generateTravelerForms(
                  this.booking.adults,
                  this.booking.children,
                  this.booking.infants
                );
                this.booking.flights = [];
                if (
                  Array.isArray(flightData.details) &&
                  flightData.details.length > 0
                ) {
                  flightData.details.forEach((flightDetail: any) => {
                    const flight = this.processFlightDetail(
                      flightDetail,
                      flightData
                    );
                    this.booking.flights.push(flight);
                  });
                }
                // Update travel date and baggage
                this.booking.travelDate = new Date(
                  flightData.flight_date || this.booking.travelDate
                );
                this.booking.checkin =
                  flightData.details && flightData.details[0]
                    ? `${flightData.details[0].baggage_weight || '15'} KG`
                    : this.booking.checkin;
                // Update base fares for adult/infant
                if (flightData.sell_price) {
                  this.baseFareAdult = parseFloat(flightData.sell_price);
                  this.baseFareChild = parseFloat(flightData.sell_price);
                }
                if (flightData.infant_price) {
                  this.baseFareInfant = parseFloat(
                    String(flightData.infant_price)
                  );
                }
                // Recalculate total
                this.booking.totalPrice = this.calculateTotalPrice();
              }
            },
            error: (err) => {
              console.error('External availability error:', err);
            }
          });
      }
    }

    // Fallback to router state if localStorage doesn't have flight details
    if (!flightDetails) {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state) {
        const state = navigation.extras.state as {
          flightDetails: any;
          fareDetails: any;
        };

        flightDetails = state.flightDetails;
        fareDetails = state.fareDetails;
        console.log('Retrieved from router state:', state);
      }
    }

    // Update booking data if we have flight and fare details
    if (flightDetails && fareDetails) {
      // Update the booking data with the selected flight information
      this.booking = {
        ...this.booking,
        totalPrice: fareDetails.price // Set price at the booking level
      };
    }

    // If no state data, we would fetch flight details using the fareId in a real implementation
    console.log('Checking if API should be called:', {
      flightId: this.flightId,
      fareId: this.fareId,
      hasFlightDetails: !!flightDetails,
      shouldCallAPI: this.fareId && !flightDetails
    });

    console.log('fareId value:', this.fareId);

    // Use real API data only for internal fares with numeric id
    const numericFareId = Number(this.fareId);
    const isInternal =
      type === 'internal' &&
      Number.isFinite(numericFareId) &&
      numericFareId > 0;
    if (isInternal) {
      console.log('Calling loadFlightDetails API with fareId...');
      this.loadFlightDetails();
    } else {
      // Fallback to sample data if no fareId is available
      console.log('No fareId available, loading sample data instead');
      this.loadSampleFlightData();
    }
  }

  // Load sample flight data for demonstration when no API data is available
  loadSampleFlightData() {
    console.log('LOADING SAMPLE FLIGHT DATA - METHOD CALLED');
    console.log('Initial base fare values:', {
      adult: this.baseFareAdult,
      child: this.baseFareChild,
      infant: this.baseFareInfant
    });

    // Ensure loading is false from the start for sample data
    this.isLoading = false;

    // Sample flight data based on the real API response structure
    const sampleFlightData = {
      id: 25,
      flight_date: '2025-10-30',
      sector: 'AMD-DEL',
      amount: '5000.00',
      sell_price: '5000.00',
      infant_price: 1000,
      meal_option: 'complimentary',
      seat_option: 'complimentary',
      is_refundable: 0,
      pnr_status: 'onTime',
      details: [
        {
          id: 82,
          flight_inventory_id: 25,
          flight_date: '2025-10-30',
          baggage_weight: '20',
          cabin_baggage: '15',
          airline_id: 18,
          airline: 'Indigo',
          flight_number: '6E9999',
          type: 'Onward',
          from: 'AMD',
          from_id: 11,
          to: 'DEL',
          to_id: 15,
          terminal: 'T4',
          dep_time: '17:31:00',
          arr_time: '23:16:00',
          is_active: 1
        }
      ],
      fare_rules: []
    };

    // Store the sample data
    this.booking.flightInventoryData = sampleFlightData;
    this.updateInternationalFlagFromInventory(sampleFlightData);

    // Process the sample flights
    this.booking.flights = [];
    console.log('Processing sample flights...');

    if (sampleFlightData.details && sampleFlightData.details.length > 0) {
      sampleFlightData.details.forEach((flightDetail: any) => {
        const flight = this.processFlightDetail(flightDetail, sampleFlightData);
        this.booking.flights.push(flight);
        console.log('Added flight:', flight);
      });
    }

    console.log('Final booking.flights:', this.booking.flights);
    console.log('booking.flights.length:', this.booking.flights.length);

    // Update booking data with sample response while preserving flights array
    this.booking.travelDate = new Date(sampleFlightData.flight_date);
    this.booking.checkin =
      sampleFlightData.details && sampleFlightData.details[0]
        ? `${sampleFlightData.details[0].baggage_weight || '15'} KG`
        : this.booking.checkin;

    // Update price information from sample data
    if (sampleFlightData.sell_price) {
      this.baseFareAdult = parseFloat(sampleFlightData.sell_price);
      this.baseFareChild = parseFloat(sampleFlightData.sell_price);
      console.log('Sample data: Set baseFareAdult to:', this.baseFareAdult);
    }

    if (sampleFlightData.infant_price) {
      this.baseFareInfant = sampleFlightData.infant_price;
      console.log('Sample data: Set baseFareInfant to:', this.baseFareInfant);
    }

    // Recalculate total price
    this.booking.totalPrice = this.calculateTotalPrice();

    // Set loading to false to display the flight details
    this.isLoading = false;

    console.log('Sample flight data loaded:', this.booking);
  }

  loadFlightDetails() {
    console.log('loadFlightDetails called with fareId:', this.fareId);

    if (!this.fareId) {
      console.log('No fare ID available');
      return;
    }

    this.isLoading = false;
    console.log(
      'Starting API call to getFlightById with fareId:',
      Number(this.fareId)
    );

    this.flightInventoryService.getFlightById(Number(this.fareId)).subscribe({
      next: (response) => {
        console.log('Flight details loaded from API:', response);
        if (response) {
          const flightData = response;

          // Store the complete API response
          this.booking.flightInventoryData = flightData;
          this.updateInternationalFlagFromInventory(flightData);
          // Regenerate traveler forms to reflect allow_tba_user correctly
          this.generateTravelerForms(
            this.booking.adults,
            this.booking.children,
            this.booking.infants
          );
          //console.log(this.booking.flightInventoryData);
          // Process multiple flights from details array
          this.booking.flights = [];

          if (flightData.details && flightData.details.length > 0) {
            flightData.details.forEach((flightDetail: any) => {
              const flight = this.processFlightDetail(flightDetail, flightData);
              this.booking.flights.push(flight);
            });
          }

          // Update booking data with API response - directly update properties to preserve flights array
          this.booking.travelDate = new Date(
            flightData.flight_date || this.booking.travelDate
          );
          this.booking.checkin =
            flightData.details && flightData.details[0]
              ? `${flightData.details[0].baggage_weight || '15'} KG`
              : this.booking.checkin;

          // Update price information from API
          if (flightData.sell_price) {
            this.baseFareAdult = parseFloat(flightData.sell_price);
            this.baseFareChild = parseFloat(flightData.sell_price); // Use same price for child, can be adjusted
            console.log('Set baseFareAdult to:', this.baseFareAdult);
          }

          if (flightData.infant_price) {
            this.baseFareInfant = parseFloat(flightData.infant_price);
            console.log('Set baseFareInfant to:', this.baseFareInfant);
          }

          // Force change detection to update the view
          setTimeout(() => {
            console.log('Current base fares:', {
              adult: this.baseFareAdult,
              child: this.baseFareChild,
              infant: this.baseFareInfant
            });
          }, 0);

          // Recalculate total price
          this.booking.totalPrice = this.calculateTotalPrice();

          console.log(
            'Updated booking object with multiple flights:',
            this.booking
          );
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading flight details:', error);
        this.isLoading = false;
      }
    });
  }

  // Helper method to process individual flight details
  private processFlightDetail(flightDetail: any, flightData: any): any {
    // Calculate duration from departure and arrival times
    const calculateDuration = (depTime: string, arrTime: string) => {
      if (!depTime || !arrTime) return '1h 35m';

      const [depHours, depMinutes] = depTime.split(':').map(Number);
      const [arrHours, arrMinutes] = arrTime.split(':').map(Number);

      let totalMinutes =
        arrHours * 60 + arrMinutes - (depHours * 60 + depMinutes);
      if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight flights

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    };

    return {
      id: flightDetail.id,
      type: flightDetail.type, // 'Onward' or 'Return'
      airline: flightDetail.airline,
      flightNo: flightDetail.flight_number,
      from: flightDetail.from,
      to: flightDetail.to,
      fromCity: this.getAirportCity(flightDetail.from),
      toCity: this.getAirportCity(flightDetail.to),
      departTime: flightDetail.dep_time,
      arriveTime: flightDetail.arr_time,
      date: new Date(flightDetail.flight_date || flightData.flight_date),
      duration: calculateDuration(flightDetail.dep_time, flightDetail.arr_time),
      logo: this.getAirlineLogo(flightDetail.airline),
      terminal: flightDetail.terminal,
      baggageWeight: flightDetail.baggage_weight,
      cabinBaggage: flightDetail.cabin_baggage
    };
  }

  generateTravelerForms(adults: number, children: number, infants: number) {
    this.travelerForms = [];
    this.travelers = [];

    // Generate adult forms
    for (let i = 0; i < adults; i++) {
      this.travelers.push({ type: 'Adult', index: i + 1 });
      this.travelerForms.push(this.createTravelerForm('Adult'));
    }

    // Generate children forms
    for (let i = 0; i < children; i++) {
      this.travelers.push({ type: 'Child', index: i + 1 });
      this.travelerForms.push(this.createTravelerForm('Child'));
    }

    // Generate infant forms
    for (let i = 0; i < infants; i++) {
      this.travelers.push({ type: 'Infant', index: i + 1 });
      this.travelerForms.push(this.createTravelerForm('Infant'));
    }
  }

  createTravelerForm(type: string): FormGroup {
    const defaultTitle =
      type === 'Adult' ? 'Mr' : type === 'Child' ? 'Master' : 'Infant';

    // Check if allow_tba_user is set to 1
    const isTbaAllowed = this.booking.flightInventoryData?.allow_tba_user === 1;
    // Default values depend on whether TBA is allowed
    const defaultFirstName = isTbaAllowed ? 'TBA' : '';
    const defaultLastName = isTbaAllowed ? 'TBA' : '';

    // Create form with disabled fields if TBA is allowed
    const form = this.fb.group({
      type: [type],
      title: [defaultTitle, Validators.required],
      firstName: [
        defaultFirstName,
        [Validators.required, this.tbaNotAllowedValidator(isTbaAllowed)]
      ],
      lastName: [
        defaultLastName,
        [Validators.required, this.tbaNotAllowedValidator(isTbaAllowed)]
      ],
      mobile: [''],
      dateOfBirth: type !== 'Adult' ? ['', Validators.required] : [''],
      passport: ['', this.isInternational ? Validators.required : []],
      passportExpiry: ['', this.isInternational ? Validators.required : []],
      passportIssueDate: ['', this.isInternational ? Validators.required : []],
      nationality: ['', this.isInternational ? Validators.required : []]
    });

    // Manually disable fields if TBA is allowed
    if (isTbaAllowed) {
      const titleControl = form.get('title');
      const firstNameControl = form.get('firstName');
      const lastNameControl = form.get('lastName');

      if (titleControl) titleControl.disable();
      if (firstNameControl) firstNameControl.disable();
      if (lastNameControl) lastNameControl.disable();
    }

    return form;
  }

  private updateInternationalFlagFromInventory(flightData: any) {
    let s: any = null;
    if (flightData) {
      s =
        flightData.sectyp ||
        (Array.isArray(flightData.details) && flightData.details[0]?.sectyp) ||
        null;
    }
    const sv = typeof s === 'string' ? s.toLowerCase() : '';
    this.isInternational = sv === 'int';
  }

  private tbaNotAllowedValidator(isTbaAllowed: boolean): ValidatorFn {
    return (control) => {
      if (isTbaAllowed) {
        return null;
      }
      const value = (control?.value || '').toString().trim();
      return value.toLowerCase() === 'tba' ? { tbaNotAllowed: true } : null;
    };
  }

  applyDiscount() {
    // Implement coupon code logic
    if (this.couponCode.value) {
      // Call API to validate and apply coupon
      console.log('Applying coupon:', this.couponCode.value);
    }
  }

  // Fetch contact details using entered mobile number
  fetchDetailsByMobile() {
    const mobileRaw = this.mobileNumberControl.value;
    const mobile = (mobileRaw || '').toString().trim();

    // Basic validation: require at least 7 digits
    const digitsOnly = mobile.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 7) {
      this.toastr.warning('Please enter a valid mobile number.');
      return;
    }

    // Patch contact form phone with the provided mobile
    this.contactForm.patchValue({ phone: mobile });

    // Call backend API to fetch traveler details by mobile
    this.isLoading = true;
    this.http
      .post(`${environment.apiUrl}/orders/fetch-details-by-mobile`, {
        customer_mobile: mobile
      })
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success && response.data) {
            // Build travelers array (supports array or single record from API)
            const travelers = Array.isArray(response.data)
              ? response.data.map((d: any) => ({
                  type: d.type || 'Adult',
                  title: d.title,
                  firstName: d.first_name ?? d.firstName,
                  lastName: d.last_name ?? d.lastName
                }))
              : [
                  {
                    type: 'Adult',
                    title: response.data.title,
                    firstName: response.data.first_name,
                    lastName: response.data.last_name
                  }
                ];

            const required = {
              adult: this.booking.adults || 0,
              child: this.booking.children || 0,
              infant: this.booking.infants || 0
            };

            const dialogRef = this.dialog.open(TravelerDetailsDialog, {
              data: { travelers, required, type: this.bookingType }
            });

            dialogRef.afterClosed().subscribe((selected: any[]) => {
              if (Array.isArray(selected) && selected.length) {
                this.applySelectedTravelers(selected);
              }
            });
          } else {
            this.toastr.info(
              response.message ||
                'No traveler details found for this mobile number.'
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.toastr.error('Failed to fetch traveler details.');
        }
      });
  }

  private getDefaultTitleForType(type: string): string {
    return type === 'Adult' ? 'Mr' : type === 'Child' ? 'Master' : 'Infant';
  }

  private resetFormFields(form: FormGroup, type: string): void {
    const isTbaAllowed = this.booking.flightInventoryData?.allow_tba_user === 1;
    const defaultTitle = this.getDefaultTitleForType(type);
    const defaultFirstName = isTbaAllowed ? 'TBA' : '';
    const defaultLastName = isTbaAllowed ? 'TBA' : '';
    form.patchValue({
      title: defaultTitle,
      firstName: defaultFirstName,
      lastName: defaultLastName
    });
  }

  private findNextUnfilledFormIndex(
    type: 'Adult' | 'Child' | 'Infant'
  ): number {
    return this.travelerForms.findIndex((form) => {
      const fType = (form.get('type')?.value || '') as string;
      if (fType !== type) return false;
      const fn = (form.get('firstName')?.value || '')
        .toString()
        .trim()
        .toLowerCase();
      const ln = (form.get('lastName')?.value || '')
        .toString()
        .trim()
        .toLowerCase();
      // Consider empty or TBA as unfilled
      return !fn || fn === 'tba' || !ln || ln === 'tba';
    });
  }

  private applySelectedTravelers(selected: any[]): void {
    // Clear previously patched forms (only those patched via dialog)
    ['Adult', 'Child', 'Infant'].forEach((t) => {
      const indices = (this.dialogPatchedIndices as any)[t] as number[];
      indices.forEach((idx) => {
        const form = this.travelerForms[idx];
        if (form) this.resetFormFields(form, t as any);
      });
      (this.dialogPatchedIndices as any)[t] = [];
    });

    // Apply new selection respecting counts and form availability
    selected.forEach((rec: any) => {
      const typeStr = (rec.type || 'Adult') as string;
      const type: 'Adult' | 'Child' | 'Infant' = typeStr
        .toLowerCase()
        .startsWith('inf')
        ? 'Infant'
        : typeStr.toLowerCase().startsWith('chi')
          ? 'Child'
          : 'Adult';

      const idx = this.findNextUnfilledFormIndex(type);
      if (idx !== -1) {
        const form = this.travelerForms[idx];
        form.patchValue({
          title: rec.title,
          firstName: rec.firstName ?? rec.first_name,
          lastName: rec.lastName ?? rec.last_name
        });
        (this.dialogPatchedIndices as any)[type].push(idx);
      }
    });
  }

  openVerificationModal() {
    // Validate all traveler forms and contact form before showing modal

    const allTravelerFormsValid = this.travelerForms.every(
      (form) => form.valid
    );

    if (allTravelerFormsValid && this.contactForm.valid) {
      this.showVerificationModal = true;
    } else {
      // Mark all fields as touched to trigger validation messages
      this.travelerForms.forEach((form) => this.markFormGroupTouched(form));
      this.markFormGroupTouched(this.contactForm);
    }
  }

  closeVerificationModal() {
    this.showVerificationModal = false;
  }

  proceedToPayment() {
    // Close modal and proceed with payment
    this.showVerificationModal = false;

    // Validate all traveler forms and contact form
    const allTravelerFormsValid = this.travelerForms.every(
      (form) => form.valid
    );

    if (allTravelerFormsValid && this.contactForm.valid) {
      const bookingData: any = {
        booking_id: 25,
        travelers: this.travelerForms.map((form) => {
          const v = form.value as any;
          return {
            type: (v.type || '').toLowerCase(),
            title: v.title,
            firstName: v.firstName,
            lastName: v.lastName,
            date_of_birth: v.dateOfBirth || null,
            passport: v.passport || null,
            passport_expiry: v.passportExpiry || null,
            passport_issue_date: v.passportIssueDate || null,
            country_code: v.nationality || null
          };
        }),
        contact: this.contactForm.value,
        flight_id: this.flightId,
        price: this.booking.totalPrice,
        service_fee: this.serviceFee,
        commission: this.commission,
        discount: this.discount,
        customer_mobile: this.mobileNumberControl?.value || '',
        type: this.bookingType
      };

      if (this.bookingType === 'external') {
        bookingData.ukey = this.externalUkey || '';
        bookingData.rmkey = this.externalRmkey || [];
        bookingData.sectyp =
          (this.booking?.flightInventoryData &&
            (this.booking.flightInventoryData.sectyp ||
              (Array.isArray(this.booking.flightInventoryData.details) &&
                this.booking.flightInventoryData.details[0]?.sectyp))) ||
          null;
      }

      console.log('Creating order with data:', bookingData);
      this.isLoading = true;

      this.http
        .post(`${environment.apiUrl}/orders/create-flight-order`, bookingData)
        .pipe(
          catchError((error) => {
            console.error('Error creating order:', error);
            this.isLoading = false;
            alert('Failed to create order. Please try again.');
            return throwError(() => error);
          })
        )
        .subscribe((response: any) => {
          this.isLoading = false;
          if (response.success) {
            console.log('Order created successfully:', response);
            localStorage.setItem('order_id', response.data.order_id.toString());
            this.router.navigate(['/flights/payment', response.data.order_id]);
          } else {
            alert('Failed to create order: ' + response.message);
          }
        });
    } else {
      // Mark all fields as touched to trigger validation messages
      this.travelerForms.forEach((form) => this.markFormGroupTouched(form));
      this.markFormGroupTouched(this.contactForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  // Fare calculation data from API
  fareCalculationData: any = null;

  // Calculate fare charges using API
  calculateFareCharges() {
    // Determine fare type and price
    const localData = localStorage.getItem('specialBookingData');
    let type: 'internal' | 'external' = 'internal';
    let farePrice: number | null = null;
    try {
      const bookingData = localData ? JSON.parse(localData) : {};
      type = bookingData.type === 'external' ? 'external' : 'internal';
      farePrice =
        typeof bookingData.farePrice === 'number'
          ? bookingData.farePrice
          : bookingData?.fareDetails?.price ?? null;
    } catch {}

    const numericFlightId = Number(this.flightId);
    const isInternal =
      type === 'internal' &&
      Number.isFinite(numericFlightId) &&
      numericFlightId > 0;

    if (!isInternal && type !== 'external') {
      console.error('Cannot determine fare type for calculation');
    } else {
      // Prepare travelers array for API
      const travelers = [];

      // Add adult travelers
      for (let i = 0; i < this.booking.adults; i++) {
        travelers.push({ type: 'adult' });
      }

      // Add child travelers
      for (let i = 0; i < this.booking.children; i++) {
        travelers.push({ type: 'child' });
      }

      // Add infant travelers
      for (let i = 0; i < this.booking.infants; i++) {
        travelers.push({ type: 'infant' });
      }

      // Prepare request payload
      let payload: any = { travelers };
      if (isInternal) {
        payload.flight_id = numericFlightId;
        payload.type = 'internal';
      } else {
        payload.type = 'external';
        payload.price = farePrice ?? this.booking.totalPrice;
      }

      console.log('Calculating fare charges with payload:', payload);

      // Call the API
      this.http
        .post<any>(`${environment.apiUrl}/orders/calculate-charges`, payload)
        .subscribe({
          next: (response) => {
            if (response.success) {
              console.log('Fare calculation successful:', response.data);
              this.fareCalculationData = response.data;

              // Update component properties with API response
              this.baseFareAdult = parseFloat(
                this.fareCalculationData.base_fare_adult
              );
              this.baseFareChild = parseFloat(
                this.fareCalculationData.base_fare_child
              );
              this.baseFareInfant = parseFloat(
                this.fareCalculationData.base_fare_infant
              );
              this.serviceFee = this.fareCalculationData.service_fee;
              this.serviceFeecgst = this.fareCalculationData.cgst;
              this.serviceFeesgst = this.fareCalculationData.sgst;
              this.commission = this.fareCalculationData.commission;
              this.tdsonCommission = this.fareCalculationData.tds_on_commission;
              this.isSameState = this.fareCalculationData.is_same_state;

              // Update booking total price
              this.booking.totalPrice = this.fareCalculationData.final_total;

              // Trigger change detection to update the view
              setTimeout(() => {
                console.log(
                  'Updated fare calculation data:',
                  this.fareCalculationData
                );
              }, 0);
            } else {
              console.error('Fare calculation failed:', response.message);
              this.toastr.error(
                response.message || 'Failed to calculate fare charges'
              );
            }
          },
          error: (error) => {
            console.error('Error calculating fare charges:', error);
            this.toastr.error(
              'Error calculating fare charges. Please try again.'
            );
          }
        });
    }
  }

  // Update traveler count and recalculate fare charges
  updateTravelerCount(type: string, action: string) {
    if (action === 'add') {
      this.booking[type]++;
    } else if (action === 'remove' && this.booking[type] > 0) {
      this.booking[type]--;
    }

    // Regenerate traveler forms
    this.generateTravelerForms(
      this.booking.adults,
      this.booking.children,
      this.booking.infants
    );

    // Recalculate fare charges when traveler count changes
    if (this.flightId) {
      this.calculateFareCharges();
    }
  }

  // Price calculation methods (now using API data if available)
  calculateAdultPrice(): number {
    return this.fareCalculationData
      ? parseFloat(this.fareCalculationData.total_adult_fare)
      : this.baseFareAdult * this.booking.adults;
  }

  calculateChildPrice(): number {
    return this.fareCalculationData
      ? parseFloat(this.fareCalculationData.total_child_fare)
      : this.baseFareChild * this.booking.children;
  }

  calculateInfantPrice(): number {
    return this.fareCalculationData
      ? parseFloat(this.fareCalculationData.total_infant_fare)
      : this.baseFareInfant * this.booking.infants;
  }

  calculateSubtotal(): number {
    return this.fareCalculationData
      ? parseFloat(this.fareCalculationData.total_base_fare)
      : this.calculateAdultPrice() +
          this.calculateChildPrice() +
          this.calculateInfantPrice();
  }

  calculateTotalPrice(): number {
    // Use API data if available, otherwise fall back to local calculation
    if (this.fareCalculationData) {
      return parseFloat(this.fareCalculationData.final_total);
    }

    // Fallback to local calculation
    return (
      this.calculateSubtotal() +
      this.serviceFee +
      this.serviceFeesgst +
      this.serviceFeecgst +
      this.tdsonCommission -
      this.commission
    );
  }

  // Populate contact form with user data from localStorage
  populateContactFormFromLocalStorage() {
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');

      if (userData) {
        const user = JSON.parse(userData);

        // Populate contact form with user data
        this.contactForm.patchValue({
          email: user.email || '',
          phone: user.phone || '',
          city: user.state_name || '',
          agentRef: ''
        });
      }
    } catch (error) {
      console.error('Error populating contact form from localStorage:', error);
    }
  }

  // Check if booking is allowed based on cut-off days
  isBookingAllowed(): boolean {
    if (!this.booking.flightInventoryData) {
      return true; // Default to allowed if no data
    }

    const flightData = this.booking.flightInventoryData;
    const flightDate = new Date(flightData.flight_date);
    const cutOffDays = flightData.booking_cut_off_days || 0;

    // Calculate cut-off date by subtracting cut-off days from flight date
    const cutOffDate = new Date(flightDate);
    cutOffDate.setDate(cutOffDate.getDate() - cutOffDays);

    // Compare current date with cut-off date
    const currentDate = new Date();

    // Format dates for logging
    console.log('Flight date:', flightDate.toISOString().split('T')[0]);
    console.log('Cut-off date:', cutOffDate.toISOString().split('T')[0]);
    console.log('Current date:', currentDate.toISOString().split('T')[0]);

    // Return true if current date is before or equal to cut-off date
    return currentDate <= cutOffDate;
  }

  // Check if hold booking is allowed
  isHoldBookingAllowed(): boolean {
    if (!this.booking.flightInventoryData) {
      return false;
    }

    const flightData = this.booking.flightInventoryData;

    // Check if hold booking is enabled
    if (!flightData.allow_hold_booking) {
      return false;
    }

    // Check if current date is before or equal to hold booking date
    const holdBookingDate = new Date(flightData.hold_booking_date);
    const currentDate = new Date();

    // Format dates for logging
    console.log(
      'Hold booking date:',
      holdBookingDate.toISOString().split('T')[0]
    );
    console.log('Current date:', currentDate.toISOString().split('T')[0]);

    // Return true if current date is before or equal to hold booking date
    return currentDate <= holdBookingDate;
  }

  // Handle hold booking process
  holdBooking() {
    if (!this.isHoldBookingAllowed()) {
      this.snackBar.open(
        'Hold booking is not available for this flight',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    const flightData = this.booking.flightInventoryData;
    const holdType = flightData.hold_type;
    const holdValue = flightData.hold_value;
    const totalPrice = this.calculateTotalPrice();

    let holdAmount = 0;
    let holdAmountText = '';

    if (holdType === 'F') {
      // Fixed amount
      holdAmount = holdValue;
      holdAmountText = `₹${holdAmount} (Fixed amount)`;
    } else if (holdType === 'P') {
      // Percentage of total price
      holdAmount = (totalPrice * holdValue) / 100;
      holdAmountText = `₹${holdAmount.toFixed(2)} (${holdValue}% of ₹${totalPrice.toFixed(2)})`;
    }

    // Close verification modal if open
    this.closeVerificationModal();

    // Show confirmation dialog with exact format as in screenshot
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '450px',
        data: {
          title: 'Hold Booking Confirmation',
          message: `Do you want to hold this booking for ${flightData.hold_booking_limit} days?\n\nTotal Booking Amount: ₹${totalPrice.toFixed(2)}\n\nHold Charge: ₹${holdType === 'F' ? holdValue : holdAmount.toFixed(2)} (${holdType === 'F' ? 'Fixed amount' : holdValue + '% of total'})\n\nHold Valid Until: ${new Date(flightData.hold_booking_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`,
          confirmText: 'Confirm Hold',
          cancelText: 'Cancel',
          useTextFormat: true
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          // Process hold booking
          this.processHoldBooking(holdAmount);
        }
      });
  }

  // Get hold order ID from localStorage
  getHoldOrderId(): string | null {
    return localStorage.getItem('hold_order_id');
  }

  // UI handler for confirm hold booking button
  confirmHoldBookingUI() {
    const holdOrderId = this.getHoldOrderId();
    if (holdOrderId) {
      // Default hold amount or get from form/storage as needed
      const holdAmount = 1000; // You can adjust this or make it dynamic
      this.confirmHoldBooking(parseInt(holdOrderId), holdAmount);
    } else {
      this.toastr.error('No hold booking found to confirm');
    }
  }

  // Confirm a hold booking
  confirmHoldBooking(orderId: number, holdAmount: number) {
    // Show loading indicator
    this.isLoading = true;

    // Prepare travelers from existing forms
    const travelers = this.travelerForms.map((form) => {
      const v = form.value as any;
      return {
        type: (v.type || '').toLowerCase(),
        title: v.title,
        firstName: v.firstName,
        lastName: v.lastName,
        date_of_birth: v.dateOfBirth || null,
        passport: v.passport || null,
        passport_expiry: v.passportExpiry || null,
        passport_issue_date: v.passportIssueDate || null,
        country_code: v.nationality || null
      };
    });

    // Prepare contact data from contactForm
    const contact = { ...this.contactForm.value };

    // Prepare order data aligned with backend contract for confirming hold
    const confirmHoldData = {
      booking_id: orderId, // Use the order ID from the hold booking
      travelers,
      contact,
      flight_id: this.flightId,
      price: this.calculateTotalPrice(),
      service_fee: this.serviceFee,
      commission: this.commission,
      discount: this.discount,
      status: 1, // Confirmed status
      hold_amount: holdAmount, // Include hold amount in payload
      customer_mobile: this.mobileNumberControl?.value || ''
    };

    // Call API to confirm the hold booking
    this.http
      .post(`${environment.apiUrl}/orders/create-flight-order`, confirmHoldData)
      .pipe(
        catchError((error) => {
          this.isLoading = false;
          this.toastr.error(
            'Failed to confirm booking: ' + (error.message || 'Unknown error')
          );
          return throwError(() => error);
        })
      )
      .subscribe((response: any) => {
        this.isLoading = false;
        if (response.success) {
          // Show success message
          this.toastr.success('Hold booking confirmed successfully!');

          // Navigate to payment page with order_id
          this.router.navigate(['/flights/payment', response.data.order_id]);
        } else {
          this.toastr.error('Failed to confirm booking: ' + response.message);
        }
      });
  }

  // Process the hold booking
  processHoldBooking(holdAmount: number) {
    // Show loading indicator
    this.isLoading = true;

    // Prepare travelers from existing forms
    const travelers = this.travelerForms.map((form) => {
      const v = form.value as any;
      return {
        type: (v.type || '').toLowerCase(),
        title: v.title,
        firstName: v.firstName,
        lastName: v.lastName,
        date_of_birth: v.dateOfBirth || null,
        passport: v.passport || null,
        passport_expiry: v.passportExpiry || null,
        passport_issue_date: v.passportIssueDate || null,
        country_code: v.nationality || null
      };
    });

    // Prepare contact data from contactForm
    const contact = { ...this.contactForm.value };

    // Prepare order data aligned with backend contract
    const bookingData = {
      booking_id: 25, // temporary fixed booking id used elsewhere
      travelers,
      contact,
      flight_id: this.flightId,
      price: this.calculateTotalPrice(),
      service_fee: this.serviceFee,
      commission: this.commission,
      discount: this.discount,
      status: 9, // pending order status for hold booking
      hold_amount: holdAmount, // store hold amount in order table
      customer_mobile: this.mobileNumberControl?.value || ''
    };

    // Call API to create flight order (hold)
    this.http
      .post(`${environment.apiUrl}/orders/create-flight-order`, bookingData)
      .subscribe(
        (response: any) => {
          this.isLoading = false;
          if (response.success) {
            // Show success message
            this.snackBar.open('Booking held successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });

            // Store the order ID for later confirmation
            localStorage.setItem(
              'hold_order_id',
              response.data.order_id.toString()
            );
            this.router.navigate(['/flights/payment', response.data.order_id]);
            // Redirect to My Bookings after successful hold
            //    this.router.navigate(['/my-bookings']);
          } else {
            // Show error message
            this.snackBar.open(
              response.message || 'Failed to hold booking',
              'Close',
              {
                duration: 3000,
                panelClass: ['error-snackbar']
              }
            );
          }
        },
        (error) => {
          this.isLoading = false;
          // Show error message
          this.snackBar.open(
            'Failed to hold booking. Please try again.',
            'Close',
            {
              duration: 3000,
              panelClass: ['error-snackbar']
            }
          );
          console.error('Hold booking error:', error);
        }
      );
  }

  // Helper method to get airport city name from airport code
  private getAirportCity(airportCode: string): string {
    const airportCities: { [key: string]: string } = {
      AMD: 'Ahmedabad',
      DEL: 'Delhi',
      BOM: 'Mumbai',
      BLR: 'Bangalore',
      MAA: 'Chennai',
      CCU: 'Kolkata',
      HYD: 'Hyderabad',
      GOI: 'Goa',
      COK: 'Kochi',
      PNQ: 'Pune'
    };
    return airportCities[airportCode] || airportCode;
  }

  // Get the current logged-in user ID from localStorage
  private getCurrentUserId(): Promise<void> {
    return new Promise<void>((resolve) => {
      const userStr = localStorage.getItem('user');
      console.log('Raw user data from localStorage:', userStr);

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log('Current user details:', user);
          this.userId = user.id;
          console.log('Current user ID:', this.userId);
          console.log('User name:', user.name);
          console.log('User email:', user.email);
          console.log('User role:', user.role);
          console.log('User state:', user.state);

          // For testing purposes, if no user ID is found, set a default one
          if (!this.userId) {
            console.log('Setting default user ID for testing');
            this.userId = 1; // Set a default user ID for testing
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          this.userId = 1; // Set a default user ID for testing
        }
      } else {
        console.warn(
          'No user data found in localStorage, using default user ID'
        );
        this.userId = 1; // Set a default user ID for testing
      }
      resolve();
    });
  }

  // Fetch commission data from the backend
  private fetchCommissionData(): void {
    if (!this.userId) {
      console.warn('No user ID available, cannot fetch commission data');
      return;
    }

    this.specialFlightService.getCommissionByUserId(this.userId).subscribe({
      next: (data) => {
        if (data) {
          console.log('Commission data fetched successfully:', data);
          console.log('Tax settings:', data.tax_settings);

          // Pass markup, discount, and tax settings to the calculation method
          this.calculateServiceFees(
            data.markup || 0,
            data.discount || 0,
            data.tax_settings || {}
          );
        } else {
          console.warn('No commission data found');
        }
      },
      error: (error) => {
        console.error('Error fetching commission data:', error);
      }
    });
  }

  // Calculate service fees with dynamic tax rates from API
  private calculateServiceFees(
    markup: number,
    discount?: number,
    taxSettings?: any
  ): void {
    console.log('Calculating service fees with tax settings:', taxSettings);

    // Set the markup as the final service fee (including taxes)
    const finalAmount = markup;
    let totalTaxRate = 0;

    // Get current user data for state comparison and PAN check
    const userStr = localStorage.getItem('user');
    let userState: string | number = '';
    let userPanNo: string = '';

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userState = user.state;
        userPanNo = user.pan_no;
        console.log('User state for tax calculation:', userState);
        console.log('User PAN number for TDS calculation:', userPanNo);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    // Determine which tax rates to apply based on tax settings and user state
    if (taxSettings) {
      // Compare user state with tax settings state
      const taxSettingsState = taxSettings.state;
      console.log('Tax settings state:', taxSettingsState);

      // Check if states match
      this.isSameState =
        userState &&
        taxSettingsState &&
        userState.toString() === taxSettingsState.toString();
      console.log('States match?', this.isSameState);

      if (this.isSameState && taxSettings.cgst && taxSettings.sgst) {
        // Same state: Apply CGST and SGST
        console.log('User is in same state as company, applying CGST/SGST');

        const cgstRate = parseFloat(taxSettings.cgst) / 100;
        const sgstRate = parseFloat(taxSettings.sgst) / 100;
        totalTaxRate = cgstRate + sgstRate;

        // Calculate base amount (before tax)
        const baseAmount = finalAmount / (1 + totalTaxRate);

        // Set the service fee (base amount)
        this.serviceFee = parseFloat(baseAmount.toFixed(2));

        // Calculate CGST and SGST
        this.serviceFeecgst = parseFloat((baseAmount * cgstRate).toFixed(2));
        this.serviceFeesgst = parseFloat((baseAmount * sgstRate).toFixed(2));
      } else if (!this.isSameState && taxSettings.igst) {
        // Different state: Apply IGST
        console.log('User is in different state than company, applying IGST');

        const igstRate = parseFloat(taxSettings.igst) / 100;
        totalTaxRate = igstRate;

        // Calculate base amount (before tax)
        const baseAmount = finalAmount / (1 + totalTaxRate);

        // Set the service fee (base amount)
        this.serviceFee = parseFloat(baseAmount.toFixed(2));

        // Set IGST (we'll use CGST field to display IGST)
        this.serviceFeecgst = parseFloat((baseAmount * igstRate).toFixed(2));
        this.serviceFeesgst = 0; // No SGST for inter-state
      } else {
        // Fallback to default calculation if no matching tax settings
        console.warn('No matching tax rates found for state comparison');
        this.isSameState = false; // Default to different state if no tax settings
        this.serviceFee = markup;
        this.serviceFeecgst = 0;
        this.serviceFeesgst = 0;
      }

      // Calculate commission based on discount and traveler count
      const totalTravelers = this.booking.adults + this.booking.children; // Exclude infants
      const baseDiscount = discount || 0;
      this.commission = parseFloat((baseDiscount * totalTravelers).toFixed(2));
      console.log(
        'Commission calculated:',
        this.commission,
        '(',
        baseDiscount,
        '* traveler count',
        totalTravelers,
        ')'
      );

      // Apply TDS based on PAN availability
      console.log('Checking PAN for TDS calculation - PAN value:', userPanNo);

      // Check if user has a valid PAN number
      const hasPan =
        userPanNo && userPanNo !== null && userPanNo.trim().length > 0;

      if (hasPan && taxSettings.tds_with_pan) {
        // User has valid PAN, apply tds_with_pan rate
        const tdsRate = parseFloat(taxSettings.tds_with_pan) / 100;
        console.log(
          'User has valid PAN - Applying TDS with PAN rate:',
          tdsRate,
          'to commission:',
          this.commission
        );
        this.tdsonCommission = parseFloat(
          (this.commission * tdsRate).toFixed(2)
        );
        console.log('TDS with PAN calculated:', this.tdsonCommission);
      } else if (taxSettings.tds_without_pan) {
        // User doesn't have PAN or PAN is null, apply tds_without_pan rate
        const tdsRate = parseFloat(taxSettings.tds_without_pan) / 100;
        console.log(
          'User has NO valid PAN - Applying TDS without PAN rate:',
          tdsRate,
          'to commission:',
          this.commission
        );
        this.tdsonCommission = parseFloat(
          (this.commission * tdsRate).toFixed(2)
        );
        console.log('TDS without PAN calculated:', this.tdsonCommission);
      } else {
        console.log('No TDS rates found in tax settings');
        this.tdsonCommission = 0;
      }
    } else {
      // Fallback to default calculation if no tax settings
      console.warn('No tax settings provided');
      this.isSameState = false; // Default to different state if no tax settings
      this.serviceFee = markup;
      this.serviceFeecgst = 0;
      this.serviceFeesgst = 0;
    }

    // Calculate commission based on number of travelers (discount per traveler * total travelers)
    // Excluding infants from the commission calculation
    const baseDiscount = discount || 0;
    const totalTravelers = this.booking.adults + this.booking.children; // Removed infants
    this.commission = parseFloat((baseDiscount * totalTravelers).toFixed(2));

    // Set discount to same value as commission for backward compatibility
    this.discount = this.commission;

    // Note: TDS calculation is now handled in the main calculateServiceFees method
    // to properly account for PAN status and apply the correct rate
  }

  // Helper method to get airline logo from airline name
  private getAirlineLogo(airlineName: string): string {
    const airlineLogos: { [key: string]: string } = {
      Indigo: 'assets/img/airlines/indigo.png',
      IndiGo: 'assets/img/airlines/indigo.png',
      'Akasa Air': 'assets/img/airlines/akasa.png',
      'Air India': 'assets/img/airlines/airindia.png',
      SpiceJet: 'assets/img/airlines/spicejet.png',
      Vistara: 'assets/img/airlines/vistara.png',
      GoAir: 'assets/img/airlines/goair.png'
    };
    return airlineLogos[airlineName] || 'assets/img/plane.png';
  }
}
