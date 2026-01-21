import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

type TravelerOption = {
  type: 'Adult' | 'Child' | 'Infant';
  title?: string;
  firstName: string;
  lastName: string;
  age?: number;
};

@Component({
  selector: 'vex-hotel-booking-confirmation',
  standalone: true,
  templateUrl: './hotel-booking-confirmation.component.html',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class HotelBookingConfirmationComponent implements OnInit {
  params: any = {};
  inventory: any = null;
  hotelName: string = '';
  photoUrl: string = '/storage/hotel/default.jpg';
  loading = true;
  error = '';
  form!: FormGroup;
  nights = 1;
  summaryText = '';
  starRating = 0;
  address = '';
  stars: number[] = [1, 2, 3, 4, 5];
  selectedDetail: any = null;
  selectedRoomName: string = '';
  paying = false;
  payError = '';
  paySuccess = '';
  charges: any = null;
  holding = false;
  holdError = '';
  holdSuccess = '';
  mobileNumberControl = new FormControl('');
  otherGuests: TravelerOption[] = [];
  availableTravelers: TravelerOption[] = [];
  showTravelerPicker = false;
  pickerError = '';
  pickerSuccess = '';
  selectedOption: any = null;
  roomBreakdowns: any[] = [];
  childAgeOptions: number[] = Array.from({ length: 18 }, (_, i) => i);
  showManualGuestForm = false;
  newGuestType: 'Adult' | 'Child' | 'Infant' = 'Adult';
  newGuestFirstName = '';
  newGuestLastName = '';
  newGuestAge = 5;
  manualGuestError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      title: ['Mr', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      address: [''],
      country: ['India'],
      state: [''],
      pincode: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      pan: [''],
      specialRequest: ['']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(() => {
      let stored: any = null;
      try {
        const raw = localStorage.getItem('hotel_booking_selection');
        if (raw) {
          stored = JSON.parse(raw);
        }
      } catch {}

      console.log(stored);
      this.params = {
        from: String(stored?.from || ''),
        to: String(stored?.to || ''),
        rooms: Number(
          (stored?.selected_option && stored.selected_option.rooms_used) ||
            stored?.rooms ||
            1
        ),
        adults: Number(stored?.adults || 2),
        children: Number(stored?.children || 0),
        infants: 0,
        childAges: Array.isArray(stored?.childAges)
          ? String((stored.childAges || []).join(','))
          : String(stored?.childAges || ''),
        inventory_id: Number(stored?.inventory_id || 0),
        selected_room_id: Number(stored?.selected_room_id || 0),
        selected_meal_type: Number(stored?.selected_meal_type || 0),
        selected_meal_type_name: String(stored?.selected_meal_type_name || ''),
        price_total: Number(stored?.price_total || 0),
        selected_detail_id: Number(
          (stored?.selected_option &&
            stored.selected_option.detail_id != null &&
            stored.selected_option.detail_id) ||
            stored?.selected_detail_id ||
            0
        )
      };
      this.selectedOption = stored?.selected_option || null;
      this.nights = this.computeNights(this.params.from, this.params.to);
      this.summaryText = `${this.nights} Nights, ${this.params.adults} Adults${this.params.children > 0 ? `, ${this.params.children} Child` : ''} • ${this.params.rooms} Room${this.params.selected_meal_type_name ? ` • ${this.params.selected_meal_type_name}` : ''}`;
      const invId = Number(this.params.inventory_id || 0);
      if (!invId) {
        this.error = 'Missing inventory';
        this.loading = false;
        return;
      }
      const detailId = Number(this.params.selected_detail_id || 0);
      // if (!detailId) {
      //   console.log(
      //     'Missing selected_detail_id in booking params',
      //     this.params
      //   );
      //   this.charges = {
      //     total_base_fare: Number(this.params.price_total || 0),
      //     final_total: Number(this.params.price_total || 0)
      //   };
      //   return;
      // }
      this.loading = true;
      this.hotelService
        .getSelectedInventoryDetail(invId, detailId, {
          from: this.params.from,
          to: this.params.to,
          rooms: this.params.rooms,
          adults: this.params.adults,
          children: this.params.children,
          childAges: this.params.childAges,
          selected_room_id: this.params.selected_room_id,
          selected_meal_type: this.params.selected_meal_type,
          inventory_id: this.params.inventory_id
        })
        .subscribe({
          next: (dres: any) => {
            const data = dres?.data ?? dres ?? {};
            const charges = data?.charges || null;
            this.charges = charges;

            const invU = data?.inventory || null;
            if (invU) {
              this.inventory = { ...(this.inventory || {}), ...invU };
              if (invU.hotel_name) {
                this.hotelName = String(invU.hotel_name);
              }
              if (
                typeof invU.star_rating !== 'undefined' &&
                invU.star_rating !== null
              ) {
                this.starRating = Number(invU.star_rating || 0);
              }
              if (invU.address) {
                this.address = String(invU.address || '');
              }
            }
            const roomU = data?.room || null;
            if (roomU && roomU.room_name) {
              this.selectedRoomName = String(roomU.room_name);
            }

            const roomsUsed =
              typeof data?.rooms_used === 'number'
                ? data.rooms_used
                : Number(this.params.rooms || 1);
            const totalChildren = Number(this.params.children || 0);

            const roomPrice = Array.isArray(data?.room_price_breakdown)
              ? data.room_price_breakdown
              : [];
            const perRoom: any = {};
            for (const row of roomPrice) {
              const idx = Number(row?.room_index || 0);
              if (!idx) continue;
              if (!perRoom[idx]) {
                perRoom[idx] = {
                  roomIndex: idx,
                  adults: Number(row?.adults || 0),
                  basePersons: Number(row?.base_persons || 0),
                  baseTotal: 0,
                  extraBeds: 0,
                  extraBedPrice: Number(row?.extra_bed_price || 0),
                  extraAmount: 0,
                  roomTotal: 0
                };
              }
              perRoom[idx].baseTotal += Number(row?.base_price || 0);
              perRoom[idx].extraBeds += Number(row?.extra_beds || 0);
              perRoom[idx].extraAmount += Number(row?.extra_bed_amount || 0);
              perRoom[idx].roomTotal += Number(row?.room_total || 0);
            }
            const list = Object.values(perRoom).sort(
              (a: any, b: any) => a.roomIndex - b.roomIndex
            );
            if (roomsUsed > 0 && totalChildren > 0 && list.length) {
              const baseChildren = Math.floor(totalChildren / roomsUsed);
              let rem = totalChildren % roomsUsed;
              for (const rb of list as any[]) {
                let c = baseChildren;
                if (rem > 0) {
                  c++;
                  rem--;
                }
                (rb as any).children = c;
              }
            }
            this.roomBreakdowns = list as any[];

            const nightsFromCharges =
              charges && typeof charges.nights === 'number'
                ? charges.nights
                : null;
            this.nights =
              nightsFromCharges ??
              this.computeNights(this.params.from, this.params.to);
            this.summaryText = `${this.nights} Nights, ${this.params.adults} Adults${
              this.params.children > 0 ? `, ${this.params.children} Child` : ''
            } • ${this.params.rooms} Room${
              this.params.selected_meal_type_name
                ? ` • ${this.params.selected_meal_type_name}`
                : ''
            }`;
            this.loading = false;
          },
          error: () => {
            this.loading = false;
          }
        });
    });
  }

  requiredGuestCounts() {
    const totalAdults = Number(this.params.adults || 1);
    const primaryAdults = 1;
    const requiredAdults = totalAdults > 0 ? totalAdults - primaryAdults : 0;
    const requiredChildren = Number(this.params.children || 0);
    const requiredInfants = Number(this.params.infants || 0);
    return {
      Adult: requiredAdults < 0 ? 0 : requiredAdults,
      Child: requiredChildren < 0 ? 0 : requiredChildren,
      Infant: requiredInfants < 0 ? 0 : requiredInfants
    };
  }

  private selectedCounts() {
    return this.otherGuests.reduce(
      (acc, g) => {
        acc[g.type]++;
        return acc;
      },
      { Adult: 0, Child: 0, Infant: 0 } as {
        Adult: number;
        Child: number;
        Infant: number;
      }
    );
  }

  canAddType(type: 'Adult' | 'Child' | 'Infant'): boolean {
    const req = this.requiredGuestCounts();
    const sel = this.selectedCounts();
    return sel[type] < (req[type] || 0);
  }

  addTravelerFromAvailable(idx: number) {
    const t = this.availableTravelers[idx];
    if (!t) return;
    if (!this.canAddType(t.type)) {
      this.pickerError = `Cannot add more ${t.type} guests`;
      return;
    }
    this.otherGuests.push({
      type: t.type,
      title: t.title,
      firstName: t.firstName,
      lastName: t.lastName
    });
    this.pickerError = '';
    this.pickerSuccess = 'Guest added';
  }

  removeOtherGuest(i: number) {
    if (i >= 0 && i < this.otherGuests.length) {
      this.otherGuests.splice(i, 1);
    }
  }

  openManualGuestForm() {
    this.showManualGuestForm = true;
    this.manualGuestError = '';
    this.newGuestType = 'Adult';
    this.newGuestFirstName = '';
    this.newGuestLastName = '';
    this.newGuestAge = 5;
  }

  cancelManualGuest() {
    this.showManualGuestForm = false;
    this.manualGuestError = '';
  }

  addManualGuest() {
    const first = this.newGuestFirstName.trim();
    const last = this.newGuestLastName.trim();
    if (!first || !last) {
      this.manualGuestError = 'Please enter first and last name';
      return;
    }
    if (!this.canAddType(this.newGuestType)) {
      this.manualGuestError = `Cannot add more ${this.newGuestType} guests`;
      return;
    }
    const guest: TravelerOption = {
      type: this.newGuestType,
      title: '',
      firstName: first,
      lastName: last
    };
    if (this.newGuestType === 'Child') {
      guest.age = this.newGuestAge;
    }
    this.otherGuests.push(guest);
    this.showManualGuestForm = false;
    this.manualGuestError = '';
  }

  fetchDetailsByMobile() {
    const mobileRaw = this.mobileNumberControl.value;
    const mobile = (mobileRaw || '').toString().trim();
    const digitsOnly = mobile.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 7) {
      this.pickerError = 'Please enter a valid mobile number';
      return;
    }
    this.form.patchValue({ phone: mobile });
    this.pickerError = '';
    this.pickerSuccess = '';
    this.http
      .post(`${environment.apiUrl}/orders/fetch-details-by-mobile`, {
        customer_mobile: mobile
      })
      .subscribe({
        next: (response: any) => {
          const data = response?.data;
          const travelers: TravelerOption[] = Array.isArray(data)
            ? data.map((d: any): TravelerOption => {
                const raw = String(d.type || '').toLowerCase();
                const type: 'Adult' | 'Child' | 'Infant' =
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
          this.availableTravelers = travelers;
          this.showTravelerPicker = true;
          if (!travelers.length) {
            this.pickerError = response?.message || 'No traveler details found';
          }
        },
        error: () => {
          this.pickerError = 'Failed to fetch traveler details';
        }
      });
  }

  get isRefundable(): boolean {
    const v = this.inventory?.is_refundable;
    return v === true || v === 1 || v === '1';
  }

  get canHoldBooking(): boolean {
    const allow = this.inventory?.allow_hold_booking;
    const allowBool = allow === true || allow === 1 || allow === '1';
    const dateStr = String(this.inventory?.hold_booking_date || '');
    if (!allowBool || !dateStr) return false;
    const dt = new Date(dateStr);
    const today = new Date();
    dt.setHours(23, 59, 59, 999);
    return isFinite(dt.getTime()) && dt.getTime() >= today.getTime();
  }

  goBackToHotel() {
    this.router.navigate(['/hotels/detail'], {
      queryParams: {
        from: this.params.from,
        to: this.params.to,
        rooms: this.params.rooms,
        adults: this.params.adults,
        children: this.params.children,
        inventory_id: this.params.inventory_id,
        type: 'confirm'
      }
    });
  }

  onPayNow() {
    if (this.paying) return;
    this.payError = '';
    this.paySuccess = '';
    const invId = Number(this.params.inventory_id || 0);
    const detailId = Number(this.params.selected_detail_id || 0);
    if (!invId || !detailId) {
      this.payError = 'Missing inventory or detail selection';
      return;
    }
    if (!this.form.valid) {
      this.payError = 'Please fill required guest details';
      return;
    }
    this.paying = true;
    const v = this.form.value;
    const payload = {
      selected_detail_id: detailId,
      rooms: Number(this.params.rooms || 1),
      adults: Number(this.params.adults || 0),
      children: Number(this.params.children || 0),
      from: String(this.params.from || ''),
      to: String(this.params.to || ''),
      price_total:
        this.charges && typeof this.charges.final_total === 'number'
          ? this.charges.final_total
          : Number(this.params.price_total || 0),
      selected_room_id: Number(this.params.selected_room_id || 0),
      selected_meal_type: Number(this.params.selected_meal_type || 0),
      contact: {
        email: String(v.email || ''),
        phone: String(v.phone || '')
      },
      guest: {
        title: String(v.title || ''),
        firstName: String(v.firstName || ''),
        lastName: String(v.lastName || ''),
        address: String(v.address || ''),
        country: String(v.country || ''),
        state: String(v.state || ''),
        pincode: String(v.pincode || ''),
        pan: String(v.pan || '')
      },
      special_request: String(v.specialRequest || ''),
      other_guests: this.otherGuests.map((g) => ({
        type: g.type,
        title: g.title || '',
        firstName: g.firstName,
        lastName: g.lastName,
        age: g.age
      })),
      meta: {
        params: this.params,
        inventory: this.inventory,
        room_breakdowns: this.roomBreakdowns,
        charges: this.charges
      }
    };
    this.hotelService.confirmHotelBooking(invId, payload).subscribe({
      next: (res: any) => {
        const ok = !!(res?.success ?? true);
        if (ok) {
          const orderId =
            res?.data?.order_id ||
            res?.order_id ||
            res?.data?.id ||
            res?.id ||
            null;
          if (orderId) {
            this.router.navigate(['/flights/payment', orderId]);
          }
          this.paySuccess = orderId
            ? `Booking confirmed. Order #${orderId}`
            : 'Booking confirmed';
        } else {
          this.payError = res?.message || 'Failed to confirm booking';
        }
        this.paying = false;
      },
      error: (err) => {
        this.payError =
          err?.error?.message || 'Failed to confirm booking. Try again';
        this.paying = false;
      }
    });
  }

  onHoldBooking() {
    if (this.holding) return;
    this.holdError = '';
    this.holdSuccess = '';
    const invId = Number(this.params.inventory_id || 0);
    const detailId = Number(this.params.selected_detail_id || 0);
    if (!invId || !detailId) {
      this.holdError = 'Missing inventory or detail selection';
      return;
    }
    if (!this.form.valid) {
      this.holdError = 'Please fill required guest details';
      return;
    }
    this.holding = true;
    const v = this.form.value;
    const finalTotal =
      this.charges && typeof this.charges.final_total === 'number'
        ? this.charges.final_total
        : Number(this.params.price_total || 0);
    const hv = Number(this.inventory?.hold_value || 0);
    const ht = String(this.inventory?.hold_type || '').toLowerCase();
    let holdAmount = 0;
    if (ht === 'percentage' && hv > 0) {
      holdAmount = Math.round((finalTotal * hv) / 100);
    } else if (hv > 0) {
      holdAmount = hv;
    } else {
      holdAmount = 0;
    }
    const payload = {
      selected_detail_id: detailId,
      rooms: Number(this.params.rooms || 1),
      adults: Number(this.params.adults || 0),
      children: Number(this.params.children || 0),
      from: String(this.params.from || ''),
      to: String(this.params.to || ''),
      price_total: finalTotal,
      selected_room_id: Number(this.params.selected_room_id || 0),
      selected_meal_type: Number(this.params.selected_meal_type || 0),
      contact: {
        email: String(v.email || ''),
        phone: String(v.phone || '')
      },
      guest: {
        title: String(v.title || ''),
        firstName: String(v.firstName || ''),
        lastName: String(v.lastName || ''),
        address: String(v.address || ''),
        country: String(v.country || ''),
        state: String(v.state || ''),
        pincode: String(v.pincode || ''),
        pan: String(v.pan || '')
      },
      special_request: String(v.specialRequest || ''),
      other_guests: this.otherGuests.map((g) => ({
        type: g.type,
        title: g.title || '',
        firstName: g.firstName,
        lastName: g.lastName
      })),
      hold_amount: holdAmount,
      customer_mobile: this.mobileNumberControl?.value || ''
    };
    this.hotelService.holdHotelBooking(invId, payload).subscribe({
      next: (res: any) => {
        const ok = !!(res?.success ?? true);
        if (ok) {
          const orderId =
            res?.data?.order_id ||
            res?.order_id ||
            res?.data?.id ||
            res?.id ||
            null;
          if (orderId) {
            localStorage.setItem('hold_order_id', String(orderId));
            this.router.navigate(['/flights/payment', orderId]);
          }
          const hours = Number(this.inventory?.hold_booking_limit || 0);
          const text =
            hours && hours > 0
              ? `${hours} hour${hours > 1 ? 's' : ''}`
              : 'the configured duration';
          this.holdSuccess = orderId
            ? `Booking held for ${text}. Order #${orderId}`
            : `Booking held for ${text}`;
        } else {
          this.holdError = res?.message || 'Failed to hold booking';
        }
        this.holding = false;
      },
      error: (err) => {
        this.holdError =
          err?.error?.message || 'Failed to hold booking. Try again';
        this.holding = false;
      }
    });
  }

  private computeNights(from: string, to: string): number {
    if (!from || !to) return 1;
    const f = new Date(from);
    const t = new Date(to);
    const diff = Math.round(
      (t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 1;
  }
}
