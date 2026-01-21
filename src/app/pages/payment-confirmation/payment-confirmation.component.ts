import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'vex-payment-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatDialogModule,
    RouterModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  templateUrl: './payment-confirmation.component.html',
  styleUrl: './payment-confirmation.component.scss'
})
export class PaymentConfirmationComponent implements OnInit {
  orderId: string = '';
  orderDetails: any = null;
  tripReference: string = '';
  loading: boolean = true;
  error: string = '';
  flightDetails: any = null;
  externalBookingDetails: any = null;
  hotelDetails: any = null;
  additionalData: any = null;
  paymentStatuses: Array<{ id: number; name: string; is_active: number }> = [];
  paymentStatusMap: { [key: number]: string } = {};
  bookingStatusName: string = '';
  // Hold timer related
  holdExpiresAt?: Date;
  holdBookingLimitHours?: number;
  holdRemainingText: string = '';
  holdTimerId: any = null;

  imgBaseUrl: string = environment.imgUrl;

  // Passenger update modal state
  showUpdateModal = false;
  passengersForm: FormArray<FormGroup> = new FormArray<FormGroup>([]);
  updatingPassengers = false;

  showCancelModal = false;
  cancelPreview: any = null;
  cancelTarget: { traveler: any; index: number } | null = null;

  fullImgUrl(path: string | null | undefined): string {
    const fallback = '/storage/hotel/default.jpg';
    const base = this.imgBaseUrl || '';
    if (!path) {
      const b = base.endsWith('/') ? base.slice(0, -1) : base;
      const p = fallback.startsWith('/') ? fallback.slice(1) : fallback;
      return `${b}/${p}`;
    }
    if (/^https?:\/\//i.test(path)) return path;
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${b}/${p}`;
  }

  get hotelRoomsFromOrder(): any[] {
    const rooms = this.orderDetails?.hotel_rooms;
    return Array.isArray(rooms) ? rooms : [];
  }

  get primaryHotelRoom(): any | null {
    const rooms = this.hotelRoomsFromOrder;
    return rooms.length ? rooms[0] : null;
  }

  // Determine if naming update window is open based on flight_date and naming_cut_off_days
  isNamingWindowOpen(): boolean {
    try {
      const inv = this.flightDetails?.inventory ?? this.flightDetails;
      const flightDateStr: string | undefined = inv?.flight_date;
      const namingCutOffDays: number = Number(inv?.naming_cut_off_days ?? 0);
      if (!flightDateStr || !namingCutOffDays) {
        return false;
      }
      const flightDate = new Date(flightDateStr);
      const cutOffDate = new Date(flightDate);
      cutOffDate.setDate(cutOffDate.getDate() - namingCutOffDays);
      const currentDate = new Date();
      return currentDate <= cutOffDate;
    } catch {
      return false;
    }
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // First check for path parameter (for flights/booking-confirmation/:id route)
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.orderId = params['id'];
        this.fetchOrderDetails(this.orderId);
      } else {
        // Fall back to query parameter (for payment-confirmation?order_id= route)
        this.route.queryParams.subscribe((queryParams) => {
          if (queryParams['order_id']) {
            this.orderId = queryParams['order_id'];
            this.fetchOrderDetails(this.orderId);
          } else {
            this.error = 'No order ID provided';
            this.loading = false;
          }
        });
      }
    });

    // Load payment statuses to map order status id -> name
    this.fetchPaymentStatuses();
  }

  fetchOrderDetails(orderId: string) {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/orders/${orderId}`).subscribe({
      next: (response: any) => {
        console.log('API Response:', response);

        // Check if response has a nested data structure
        if (response && response.data) {
          console.log('Order details:', response.data);
          console.log('Traveler details:', response.data.details);
          this.orderDetails = response.data;
          this.tripReference = response.data.reference_number || '';
          try {
            const addRaw = this.orderDetails?.additional_data;
            this.additionalData =
              typeof addRaw === 'string' ? JSON.parse(addRaw) : addRaw;
          } catch {
            this.additionalData = null;
          }

          if (this.orderDetails.type === 'external_flight') {
            const bkid = this.orderDetails.external_id;
            if (bkid) {
              this.fetchExternalFlightDetails(bkid);
            }
          } else if (this.orderDetails.type === 'hotel') {
            if (this.orderDetails.type_id) {
              this.fetchHotelDetails(this.orderDetails.type_id);
            }
          } else {
            if (this.orderDetails.type_id) {
              this.fetchFlightDetails(this.orderDetails.type_id);
            }
          }

          // Resolve display status name
          this.resolveBookingStatusName();
          // Attempt starting hold timer when data is sufficient
          this.maybeInitHoldTimer();

          // Initialize passenger update form if required
          this.initPassengerUpdateFormIfNeeded();
        } else {
          // Handle direct response format
          console.log('Direct response format');
          this.orderDetails = response;
          this.tripReference = response.reference_number || '';
          try {
            const addRaw = this.orderDetails?.additional_data;
            this.additionalData =
              typeof addRaw === 'string' ? JSON.parse(addRaw) : addRaw;
          } catch {
            this.additionalData = null;
          }

          if (this.orderDetails.type === 'external_flight') {
            const bkid = this.orderDetails.external_id;
            if (bkid) {
              this.fetchExternalFlightDetails(bkid);
            }
          } else if (this.orderDetails.type === 'hotel') {
            if (this.orderDetails.type_id) {
              this.fetchHotelDetails(this.orderDetails.type_id);
            }
          } else {
            if (this.orderDetails.type_id) {
              this.fetchFlightDetails(this.orderDetails.type_id);
            }
          }

          // Resolve display status name
          this.resolveBookingStatusName();
          // Attempt starting hold timer when data is sufficient
          this.maybeInitHoldTimer();

          // Initialize passenger update form if required
          this.initPassengerUpdateFormIfNeeded();
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching order details:', err);
        this.error = 'Failed to load order details. Please try again.';
        this.loading = false;
      }
    });
  }

  fetchHotelDetails(typeId: number) {
    this.http
      .get(`${environment.apiUrl}/hotel-inventories/${typeId}`)
      .subscribe({
        next: (res: any) => {
          this.hotelDetails = res?.data ?? res ?? null;
          const limit =
            this.hotelDetails?.hold_booking_limit ??
            this.hotelDetails?.inventory?.hold_booking_limit;
          if (typeof limit !== 'undefined') {
            this.holdBookingLimitHours = Number(limit);
          }
          this.maybeInitHoldTimer();
        },
        error: () => {}
      });
  }

  private fetchExternalFlightDetails(bkid: string) {
    this.http
      .get(`${environment.apiUrl}/orders/external-booking/${bkid}`)
      .subscribe({
        next: (res: any) => {
          console.log('Flight details response:', res);
          const inv = res?.data || res;
          this.externalBookingDetails = inv;
          this.flightDetails = {
            inventory: inv,
            details: Array.isArray(inv?.details) ? inv.details : []
          };

          const limit =
            this.flightDetails?.hold_booking_limit ??
            this.flightDetails?.inventory?.hold_booking_limit;
          if (typeof limit !== 'undefined') {
            this.holdBookingLimitHours = Number(limit);
          }

          if (this.flightDetails && this.flightDetails.inventory) {
            console.log('Flight inventory:', this.flightDetails.inventory);
            console.log('PNR:', this.flightDetails.inventory.pnr);
            console.log('Barcode:', this.flightDetails.inventory.barcode);
          }
        },
        error: (err) => {
          console.error('Error fetching external booking details:', err);
        }
      });
  }

  private initPassengerUpdateFormIfNeeded() {
    if (
      this.orderDetails?.update_passengers_detail === 0 &&
      Array.isArray(this.orderDetails?.details)
    ) {
      this.passengersForm.clear();
      this.orderDetails.details.forEach((d: any) => {
        const isAdult = String(d.passanger_type).toLowerCase() === 'adult';
        this.passengersForm.push(
          this.fb.group({
            id: [d.id, Validators.required],
            title: [d.title || '', Validators.required],
            firstName: [d.first_name || '', Validators.required],
            lastName: [d.last_name || '', Validators.required],
            date_of_birth: [
              d.date_of_birth || null,
              isAdult ? [] : [Validators.required]
            ]
          })
        );
      });
      // Auto-open modal for TBA updates
      this.showUpdateModal = true;
    } else {
      this.showUpdateModal = false;
    }
  }

  // Removed duplicate constructor

  openPassengerUpdateModal() {
    // Allow opening if TBA update is pending OR naming window is open
    if (
      this.orderDetails?.update_passengers_detail === 0 ||
      this.isNamingWindowOpen()
    ) {
      // Ensure form is initialized
      if (
        !this.passengersForm?.length &&
        Array.isArray(this.orderDetails?.details)
      ) {
        this.initPassengerUpdateFormIfNeeded();
      }
      this.showUpdateModal = true;
    } else {
      alert('Passenger name change window has closed for this flight.');
    }
  }

  closePassengerUpdateModal() {
    this.showUpdateModal = false;
  }

  submitPassengerUpdates() {
    if (this.passengersForm.invalid || !this.orderDetails?.id) {
      this.passengersForm.markAllAsTouched();
      return;
    }
    const travelers = this.passengersForm.getRawValue();
    const payload = {
      order_id: this.orderDetails.id,
      travelers
    };
    this.updatingPassengers = true;
    this.http
      .post(`${environment.apiUrl}/orders/update-passenger-details`, payload)
      .subscribe({
        next: (res: any) => {
          this.updatingPassengers = false;
          if (res?.success && res?.data) {
            // Refresh local order details
            this.orderDetails = res.data;
            this.showUpdateModal = false;
          } else {
            alert(res?.message || 'Failed to update passenger details');
          }
        },
        error: (err) => {
          this.updatingPassengers = false;
          console.error('Error updating passenger details:', err);
          alert(err?.error?.message || 'Failed to update passenger details');
        }
      });
  }

  fetchFlightDetails(typeId: number) {
    this.http.get(`${environment.apiUrl}/flight-details/${typeId}`).subscribe({
      next: (response: any) => {
        console.log('Flight details response:', response);
        if (response && response.data) {
          this.flightDetails = response.data;
        } else {
          this.flightDetails = response;
        }

        // Extract hold booking limit (hours) if available
        const limit =
          this.flightDetails?.hold_booking_limit ??
          this.flightDetails?.inventory?.hold_booking_limit;
        if (typeof limit !== 'undefined') {
          this.holdBookingLimitHours = Number(limit);
        }

        // Log inventory data to verify barcode availability
        if (this.flightDetails && this.flightDetails.inventory) {
          console.log('Flight inventory:', this.flightDetails.inventory);
          console.log('PNR:', this.flightDetails.inventory.pnr);
          console.log('Barcode:', this.flightDetails.inventory.barcode);
        }

        // Attempt starting hold timer when data is sufficient
        this.maybeInitHoldTimer();
      },
      error: (err) => {
        console.error('Error fetching flight details:', err);
      }
    });
  }

  fetchPaymentStatuses() {
    this.http.get(`${environment.apiUrl}/wallet/balance`).subscribe({
      next: (res: any) => {
        const statuses = res?.data?.payment_statuses ?? [];
        this.paymentStatuses = statuses;
        this.paymentStatusMap = {};
        statuses.forEach((s: any) => {
          if (s && typeof s.id !== 'undefined' && s.name) {
            this.paymentStatusMap[Number(s.id)] = String(s.name);
          }
        });
        // After loading statuses, try resolving the current order's status name
        this.resolveBookingStatusName();
        // Attempt starting hold timer when data is sufficient
        this.maybeInitHoldTimer();
      },
      error: (err) => {
        console.error(
          'Error fetching payment statuses from wallet balance:',
          err
        );
      }
    });
  }

  resolveBookingStatusName() {
    const statusId = this.orderDetails?.status;
    if (statusId === null || typeof statusId === 'undefined') {
      return;
    }
    const mapped = this.paymentStatusMap[Number(statusId)];
    if (mapped) {
      this.bookingStatusName = mapped;
      return;
    }
    // Fallback mapping if statuses not loaded or id missing
    this.bookingStatusName = this.mapFallbackStatus(Number(statusId));
  }

  mapFallbackStatus(id: number): string {
    switch (id) {
      case 1:
        return 'Confirmed';
      case 0:
        return 'Pending';
      case 2:
        return 'Cancelled';
      case 8:
        return 'hold';
      case 4:
        return 'Canceled';
      case 3:
        return 'Rejected';
      case 5:
        return 'Expired';
      case 6:
        return 'Refunded';
      case 7:
        return 'Pending';
      default:
        return 'Unknown';
    }
  }

  // Initialize hold timer when we have status=8, created_at and limit hours
  private maybeInitHoldTimer() {
    try {
      if (this.orderDetails?.status === 8) {
        if (this.orderDetails?.hold_time) {
          this.holdExpiresAt = new Date(this.orderDetails.hold_time);
          this.startHoldTimer();
          return;
        }
        if (this.orderDetails?.created_at && this.holdBookingLimitHours) {
          const createdAt = new Date(this.orderDetails.created_at);
          const expires = new Date(
            createdAt.getTime() + this.holdBookingLimitHours! * 60 * 60 * 1000
          );
          this.holdExpiresAt = expires;
          this.startHoldTimer();
        }
      }
    } catch (e) {
      console.error('Error initializing hold timer:', e);
    }
  }

  private startHoldTimer() {
    if (!this.holdExpiresAt) return;
    if (this.holdTimerId) {
      clearInterval(this.holdTimerId);
    }
    const update = () => {
      const now = new Date();
      const diffMs = this.holdExpiresAt!.getTime() - now.getTime();
      if (diffMs <= 0) {
        this.holdRemainingText = 'Hold expired';
        clearInterval(this.holdTimerId);
        this.holdTimerId = null;
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      this.holdRemainingText = `${hours} hour ${minutes} min ${seconds}s remain`;
    };
    update();
    this.holdTimerId = setInterval(update, 1000); // update every 1s for second countdown
  }

  // Navigate to flights payment page to complete payment from hold
  goToPayment() {
    const id = this.orderId || this.orderDetails?.id;
    if (!id) {
      console.error('Missing order ID for payment navigation');
      return;
    }
    this.router.navigate(['/flights/payment', id]);
  }

  ngOnDestroy() {
    if (this.holdTimerId) {
      clearInterval(this.holdTimerId);
      this.holdTimerId = null;
    }
  }

  // Confirm booking (attempt wallet payment and set status to Confirmed)
  confirmBooking() {
    if (!this.orderDetails) return;
    const payload = {
      booking_id: this.orderDetails.id,
      payment_method: 'wallet',
      amount: this.orderDetails.final_total,
      remarks: 'Confirm booking'
    };
    this.http
      .post(`${environment.apiUrl}/orders/process-payment`, payload)
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            // Update local status to confirmed
            this.orderDetails.status = 1;
            this.resolveBookingStatusName();
          } else {
            alert(res?.message || 'Failed to confirm booking');
          }
        },
        error: (err) => {
          console.error('Error confirming booking:', err);
          alert(err?.error?.message || 'Failed to confirm booking');
        }
      });
  }

  printAllTicket() {
    // Navigate to ticket print page
    this.router.navigate(['/ticket-print', this.orderId]);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  printAllTickets() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website');
      return;
    }

    // Start building the HTML content
    let printContent = `
      <html>
      <head>
        <title>Flight Tickets</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .ticket-container { margin-bottom: 20px; page-break-after: always; border: 1px solid #ccc; padding: 15px; }
          .ticket-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .passenger-name { font-weight: bold; margin-bottom: 10px; }
          .flight-info { margin-bottom: 15px; }
          .barcode-container { text-align: center; margin: 15px 0; }
          .barcode-container img { max-height: 100px; }
          @media print {
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 20px;" class="print-button">
          <button onclick="window.print()">Print Tickets</button>
        </div>
    `;

    // Add each flight ticket with its barcode
    if (this.flightDetails?.details && this.flightDetails.details.length > 0) {
      this.flightDetails.details.forEach((detail: any, index: number) => {
        // For each passenger
        if (
          this.orderDetails?.details &&
          this.orderDetails.details.length > 0
        ) {
          this.orderDetails.details.forEach(
            (passenger: any, pIndex: number) => {
              printContent += `
              <div class="ticket-container">
                <div class="ticket-header">
                  <div>
                    <h2>Boarding Pass</h2>
                    <p>Flight: ${detail.airline} ${detail.flight_number}</p>
                  </div>
                  <div>
                    <p>Date: ${this.flightDetails?.inventory?.flight_date || 'N/A'}</p>
                    <p>PNR: ${this.flightDetails?.inventory?.pnr || 'N/A'}</p>
                  </div>
                </div>
                
                <div class="passenger-name">
                  <p>${passenger.title} ${passenger.first_name} ${passenger.last_name}</p>
                </div>
                
                <div class="flight-info">
                  <p><strong>From:</strong> ${detail.from || 'N/A'} <strong>To:</strong> ${detail.to || 'N/A'}</p>
                  <p><strong>Departure:</strong> ${detail.dep_time || 'N/A'} <strong>Arrival:</strong> ${detail.arr_time || 'N/A'}</p>
                </div>
                
                <div class="barcode-container">
                  ${
                    detail.barcode
                      ? `<img src="${detail.barcode}" alt="Boarding Pass Barcode" />`
                      : index === 0 && this.flightDetails?.inventory?.barcode
                        ? `<img src="${this.flightDetails.inventory.barcode}" alt="Boarding Pass Barcode" />`
                        : '<p>No barcode available</p>'
                  }
                </div>
              </div>
            `;
            }
          );
        }
      });
    } else if (this.flightDetails?.inventory?.barcode) {
      // Fallback for legacy data
      if (this.orderDetails?.details && this.orderDetails.details.length > 0) {
        this.orderDetails.details.forEach((passenger: any) => {
          printContent += `
            <div class="ticket-container">
              <div class="ticket-header">
                <div>
                  <h2>Boarding Pass</h2>
                  <p>Flight: ${this.flightDetails?.inventory?.airline || 'N/A'}</p>
                </div>
                <div>
                  <p>Date: ${this.flightDetails?.inventory?.flight_date || 'N/A'}</p>
                  <p>PNR: ${this.flightDetails?.inventory?.pnr || 'N/A'}</p>
                </div>
              </div>
              
              <div class="passenger-name">
                <p>${passenger.title} ${passenger.first_name} ${passenger.last_name}</p>
              </div>
              
              <div class="barcode-container">
                <img src="${this.flightDetails.inventory.barcode}" alt="Boarding Pass Barcode" />
              </div>
            </div>
          `;
        });
      }
    }

    // Close the HTML content
    printContent += `
      </body>
      </html>
    `;

    // Write to the new window and trigger print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.focus();
  }

  private getFlightInventory() {
    return (
      this.flightDetails?.inventory ??
      this.flightDetails?.flightInventory ??
      null
    );
  }

  private getFareRules(): any[] {
    const invRules = this.flightDetails?.inventory?.fare_rules ?? [];
    const topRules = this.flightDetails?.fare_rules ?? [];
    return Array.isArray(topRules) && topRules.length > 0
      ? topRules
      : Array.isArray(invRules)
        ? invRules
        : [];
  }

  private getDaysUntilDeparture(): number {
    const inv = this.getFlightInventory();
    const dStr =
      this.flightDetails?.details?.[0]?.flight_date || inv?.flight_date || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return -1;
    const now = new Date();
    const ms = d.getTime() - now.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  private getApplicableFareRule(): any | null {
    const rules = this.getFareRules();
    if (!rules || rules.length === 0) return null;
    const days = this.getDaysUntilDeparture();
    const sorted = [...rules].sort(
      (a: any, b: any) =>
        Number(b.days_before_departure) - Number(a.days_before_departure)
    );
    return (
      sorted.find((r: any) => days >= Number(r.days_before_departure)) || null
    );
  }

  canCancelTraveler(): boolean {
    const inv = this.getFlightInventory();
    const refundable = Number(inv?.is_refundable ?? 0) === 1;
    const fareRule = this.getApplicableFareRule();
    const allowed = refundable && !!fareRule;
    console.log('canCancelTraveler()', {
      is_refundable: inv?.is_refundable,
      inventory_present: !!inv,
      fare_rule_present: !!fareRule,
      result: allowed
    });
    return allowed;
  }

  isRefundable(): boolean {
    const inv = this.getFlightInventory();
    const result = Number(inv?.is_refundable ?? 0) === 1;
    console.log('isRefundable()', {
      is_refundable: inv?.is_refundable,
      inventory_present: !!inv,
      result
    });
    return result;
  }

  getRefundAmount(): number {
    const r = this.getApplicableFareRule();
    const amt = r ? Number(r.refundable_amount) : 0;
    return isNaN(amt) ? 0 : amt;
  }

  cancelTraveler(traveler: any, index: number) {
    if (!this.canCancelTraveler()) {
      alert('Cancellation not allowed for this booking');
      return;
    }
    const details = Array.isArray(this.orderDetails?.details)
      ? this.orderDetails.details
      : [];
    if (details.length <= 1) {
      this.cancelFullOrder();
      return;
    }
    this.cancelTarget = { traveler, index };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Cancellation',
        message: 'Proceed with cancellation?',
        confirmText: 'Confirm Cancel',
        cancelText: 'Close',
        flightDetails: this.flightDetails,
        travelerType: traveler?.passanger_type
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.confirmCancelPassenger();
      } else {
        this.cancelTarget = null;
      }
    });
  }

  private buildTravelersForCalculation(excludeIndex: number): any[] {
    const arr = Array.isArray(this.orderDetails?.details)
      ? this.orderDetails.details
      : [];
    const mapped = arr
      .filter((_: any, i: number) => i !== excludeIndex)
      .map((d: any) => {
        const typeRaw = String(d.passanger_type || '').toLowerCase();
        let type = 'adult';
        if (typeRaw.includes('child') || typeRaw === 'chd') type = 'child';
        else if (typeRaw.includes('inf') || typeRaw.includes('baby'))
          type = 'infant';
        return { type };
      });
    return mapped;
  }

  confirmCancelPassenger() {
    if (!this.cancelTarget) {
      this.showCancelModal = false;
      return;
    }
    const orderId = this.orderDetails?.id;
    const traveler = this.cancelTarget.traveler;
    const detailId = traveler?.id; // order_details id
    const payload: any = { order_id: orderId };
    if (detailId) {
      payload.order_detail_id = detailId;
      payload.detail_id = detailId;
    }
    this.http
      .post(`${environment.apiUrl}/orders/cancel-request`, payload)
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            alert('Cancellation request submitted');
          } else {
            alert(res?.message || 'Failed to submit cancellation request');
          }
          this.showCancelModal = false;
          this.cancelTarget = null;
          this.cancelPreview = null;
        },
        error: (err) => {
          console.error('Error submitting cancel request:', err);
          alert(err?.error?.message || 'Failed to submit cancellation request');
          this.showCancelModal = false;
          this.cancelTarget = null;
          this.cancelPreview = null;
        }
      });
  }

  cancelFullOrder() {
    if (!this.orderDetails?.id) {
      alert('Missing order ID');
      return;
    }
    this.http
      .post(`${environment.apiUrl}/orders/cancel`, {
        order_id: this.orderDetails.id
      })
      .subscribe({
        next: (res: any) => {
          if (res?.success && res?.data) {
            this.orderDetails = res.data;
            this.resolveBookingStatusName();
            alert('Order cancelled');
          } else {
            alert(res?.message || 'Failed to cancel order');
          }
        },
        error: (err) => {
          console.error('Error cancelling order:', err);
          alert(err?.error?.message || 'Failed to cancel order');
        }
      });
  }
}
