import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormControl
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import {
  ActivityCartItem,
  ActivityCartService
} from 'src/app/core/services/activity-cart.service';
import {
  ActivityBookingPayload,
  ActivityService
} from 'src/app/core/services/activity.service';

@Component({
  selector: 'vex-activity-checkout',
  standalone: true,
  templateUrl: './activity-checkout.component.html',
  styleUrls: ['./activity-checkout.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivityCheckoutComponent implements OnInit {
  items: ActivityCartItem[] = [];
  subtotal = 0;
  contactForm: FormGroup;
  travelersForm: FormGroup;
  mobileNumberControl = new FormControl('');
  travelerError = '';
  travelerSuccess = '';
  submitting = false;

  /** Server-computed fare breakup. Null until the preview API responds. */
  charges: {
    total_base_fare: number;
    service_fee: number;
    markup: number;
    cgst: number;
    sgst: number;
    igst: number;
    commission: number;
    tds_on_commission: number;
    final_total: number;
    is_same_state: boolean;
  } | null = null;
  chargesLoading = false;

  constructor(
    private cartService: ActivityCartService,
    private activityService: ActivityService,
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.travelersForm = this.fb.group({
      travelers: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadCart();
    if (!this.items.length) {
      this.router.navigate(['/activities/cart']);
      return;
    }
    this.buildTravelersControls();
    this.loadCharges();
  }

  private loadCharges(): void {
    if (!this.items.length) return;
    const items = this.items.map((it) => ({
      activity_id: it.activityId,
      date: it.date,
      slot_id: it.slotId,
      start_time: it.startTime,
      end_time: it.endTime,
      adults: it.adults,
      children: it.children,
      adult_price: it.adultPrice,
      child_price: it.childPrice,
      total_price: it.totalPrice
    }));
    this.chargesLoading = true;
    this.activityService.previewCharges(items).subscribe({
      next: (res) => {
        this.charges = res as any;
        this.chargesLoading = false;
      },
      error: () => {
        this.charges = null;
        this.chargesLoading = false;
      }
    });
  }

  backToCart(): void {
    this.router.navigate(['/activities/cart']);
  }

  proceedToPayment(): void {
    if (!this.items.length) {
      this.router.navigate(['/activities/cart']);
      return;
    }
    if (this.contactForm.invalid || this.travelersForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.travelersForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 2500 });
      return;
    }

    const contact = this.contactForm.value;
    const travelers = this.travelersArray.value;

    const payload: ActivityBookingPayload & { session_token?: string } = {
      contact: {
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email,
        phone: contact.phone
      },
      items: this.items.map((it) => ({
        activity_id: it.activityId,
        date: it.date,
        slot_id: it.slotId,
        start_time: it.startTime,
        end_time: it.endTime,
        adults: it.adults,
        children: it.children,
        adult_price: it.adultPrice,
        child_price: it.childPrice,
        total_price: it.totalPrice
      })),
      travelers,
      total_amount: this.charges?.final_total ?? this.subtotal,
      session_token: this.cartService.getSessionToken()
    };

    this.submitting = true;
    this.activityService.createBooking(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        const orderId = res?.order_id || null;
        if (!orderId) {
          this.snackBar.open('Booking created but no order id was returned', 'Close', {
            duration: 3500
          });
          return;
        }
        // Order is in "Pending Payment" state. Hand off to the common payment page.
        // The cart is cleared only after successful payment (see payment-confirmation),
        // so the agent can return to the cart if payment is abandoned or fails.
        this.router.navigate(['/flights/payment', orderId]);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Failed to confirm booking. Please try again.';
        this.snackBar.open(msg, 'Close', { duration: 3500 });
      }
    });
  }

  private loadCart(): void {
    this.items = this.cartService.getItems();
    this.subtotal = this.items.reduce((sum, item) => {
      const v = item.totalPrice ?? 0;
      return sum + (typeof v === 'number' ? v : 0);
    }, 0);
  }

  private buildTravelersControls(): void {
    const totalAdults = this.items.reduce((sum, item) => sum + item.adults, 0);
    const totalChildren = this.items.reduce(
      (sum, item) => sum + item.children,
      0
    );
    const arr = this.travelersArray;
    arr.clear();
    for (let i = 0; i < totalAdults; i++) {
      arr.push(
        this.fb.group({
          type: ['Adult'],
          title: ['Mr'],
          firstName: ['', Validators.required],
          lastName: ['', Validators.required]
        })
      );
    }
    for (let i = 0; i < totalChildren; i++) {
      arr.push(
        this.fb.group({
          type: ['Child'],
          title: ['Master'],
          firstName: ['', Validators.required],
          lastName: ['', Validators.required]
        })
      );
    }
  }

  get travelersArray(): FormArray {
    return this.travelersForm.get('travelers') as FormArray;
  }

  fetchTravelersByMobile(): void {
    const mobileRaw = this.mobileNumberControl.value;
    const mobile = (mobileRaw || '').toString().trim();
    const digitsOnly = mobile.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 7) {
      this.travelerError = 'Please enter a valid mobile number';
      this.travelerSuccess = '';
      return;
    }
    this.contactForm.patchValue({ phone: mobile });
    this.travelerError = '';
    this.travelerSuccess = '';
    this.http
      .post(`${environment.apiUrl}/orders/fetch-details-by-mobile`, {
        customer_mobile: mobile
      })
      .subscribe({
        next: (response: any) => {
          const data = response?.data;
          const travelers = Array.isArray(data)
            ? data.map((d: any) => {
                const raw = String(d.type || '').toLowerCase();
                const type =
                  raw === 'child'
                    ? 'Child'
                    : raw === 'infant'
                      ? 'Infant'
                      : 'Adult';
                return {
                  type,
                  title: d.title,
                  firstName: d.first_name ?? d.firstName ?? '',
                  lastName: d.last_name ?? d.lastName ?? ''
                };
              })
            : data
              ? [
                  {
                    type: 'Adult',
                    title: data.title,
                    firstName: data.first_name ?? '',
                    lastName: data.last_name ?? ''
                  }
                ]
              : [];
          if (!travelers.length) {
            this.travelerError = response?.message || 'No traveler details found';
            this.travelerSuccess = '';
            return;
          }
          const arr = this.travelersArray;
          for (let i = 0; i < arr.length; i++) {
            const existing = arr.at(i) as FormGroup;
            const existingType = existing.get('type')?.value;
            const match =
              travelers.find((t: any) => t.type === existingType) ||
              travelers[i] ||
              null;
            if (match) {
              existing.patchValue({
                title: match.title || existing.get('title')?.value,
                firstName: match.firstName || '',
                lastName: match.lastName || ''
              });
            }
          }
          this.travelerError = '';
          this.travelerSuccess = 'Traveler details filled from mobile';
        },
        error: () => {
          this.travelerError = 'Failed to fetch traveler details';
          this.travelerSuccess = '';
        }
      });
  }
}
