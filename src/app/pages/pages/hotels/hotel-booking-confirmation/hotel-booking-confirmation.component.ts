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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  styleUrls: ['./hotel-booking-confirmation.component.scss'],
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
    MatDialogModule,
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
  paidChildWithBed = 0;
  freeChildren = 0;
  paidChildNoBed = 0;
  extraBedAdults = 0;
  extraBedChildren = 0;
  showManualGuestForm = false;
  newGuestType: 'Adult' | 'Child' | 'Infant' = 'Adult';
  newGuestFirstName = '';
  newGuestLastName = '';
  newGuestAge = 5;
  manualGuestError = '';
  imgBaseUrl: string = environment.imgUrl;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService,
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog
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
        extraBedFlags: Array.isArray(stored?.extraBedFlags)
          ? String((stored.extraBedFlags || []).join(','))
          : String(stored?.extraBedFlags || ''),
        type: String(stored?.type || 'confirm'),
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
      const storedPhoto =
        stored?.photo_url ||
        this.inventory?.photo_url ||
        '/storage/hotel/default.jpg';
      this.photoUrl = this.fullImgUrl(storedPhoto);
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
      const totalChildren = Number(this.params.children || 0);
      this.hotelService
        .detailAvailability({
          from: this.params.from,
          to: this.params.to,
          rooms: this.params.rooms,
          adults: this.params.adults,
          children: this.params.children,
          childAges: this.params.childAges
            ? String(this.params.childAges)
                .split(',')
                .map((x: string) => Number(x))
                .filter((x: number) => !isNaN(x))
            : [],
          extraBedFlags: this.params.extraBedFlags
            ? String(this.params.extraBedFlags)
                .split(',')
                .map((x: string) => Number(x))
                .filter((x: number) => !isNaN(x))
            : [],
          inventory_id: this.params.inventory_id
        })
        .subscribe({
          next: (dres: any) => {
            const data = dres?.data ?? dres ?? {};
            const roomsData = Array.isArray(data?.rooms_data)
              ? data.rooms_data
              : [];
            const selectedRoomId = Number(this.params.selected_room_id || 0);
            const selectedMealType = Number(
              this.params.selected_meal_type || 0
            );

            const roomRow =
              roomsData.find(
                (r: any) => Number(r?.room_id || 0) === selectedRoomId
              ) || null;
            const roomOptions = Array.isArray(roomRow?.options)
              ? roomRow.options
              : [];
            const opt =
              roomOptions.find(
                (o: any) => Number(o?.meal_type || 0) === selectedMealType
              ) || null;

            if (!roomRow || !opt) {
              this.error = 'Selected room or meal not available';
              this.loading = false;
              return;
            }

            this.selectedRoomName = String(roomRow.room_name || '');

            const totalPrice = Number(
              opt?.total_price ?? this.params.price_total ?? 0
            );

            this.charges = {
              total_base_fare: totalPrice,
              final_total: totalPrice,
              service_fee: 0,
              markup: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              commission: 0,
              tds_on_commission: 0
            };

            this.paidChildWithBed = Number(opt?.extra_bed_children || 0);
            this.freeChildren = Number(opt?.free_children || 0);
            this.paidChildNoBed = Math.max(
              0,
              totalChildren - this.freeChildren - this.paidChildWithBed
            );
            this.extraBedAdults = Number(opt?.extra_bed_adults || 0);
            this.extraBedChildren = this.paidChildWithBed;

            const roomsUsed =
              typeof opt?.rooms_used === 'number'
                ? opt.rooms_used
                : Number(this.params.rooms || 1);

            const adultsPerRoom = Array.isArray(opt?.adults_per_room)
              ? opt.adults_per_room
              : [];
            const perRoom: any[] = [];
            for (let i = 0; i < roomsUsed; i++) {
              const idx = i + 1;
              perRoom.push({
                roomIndex: idx,
                adults: Number(adultsPerRoom[i] || 0),
                basePersons: 0,
                baseTotal: 0,
                extraBeds: 0,
                extraBedChildren: 0,
                extraBedPrice: 0,
                extraAmount: 0,
                roomTotal: 0
              });
            }

            if (roomsUsed > 0 && perRoom.length && this.extraBedAdults > 0) {
              const base = Math.floor(this.extraBedAdults / roomsUsed);
              let rem = this.extraBedAdults % roomsUsed;
              for (const rb of perRoom as any[]) {
                let x = base;
                if (rem > 0) {
                  x++;
                  rem--;
                }
                rb.extraBeds += x;
              }
            }

            if (roomsUsed > 0 && perRoom.length && this.extraBedChildren > 0) {
              const base = Math.floor(this.extraBedChildren / roomsUsed);
              let rem = this.extraBedChildren % roomsUsed;
              for (const rb of perRoom as any[]) {
                let x = base;
                if (rem > 0) {
                  x++;
                  rem--;
                }
                rb.extraBedChildren += x;
              }
            }

            if (roomsUsed > 0 && totalChildren > 0 && perRoom.length) {
              const baseChildren = Math.floor(totalChildren / roomsUsed);
              let rem = totalChildren % roomsUsed;
              for (const rb of perRoom as any[]) {
                let c = baseChildren;
                if (rem > 0) {
                  c++;
                  rem--;
                }
                (rb as any).children = c;
              }
            }

            this.roomBreakdowns = perRoom;

            this.nights = this.computeNights(this.params.from, this.params.to);
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
        type: (this.params as any)?.type || null,
        childAges: this.params.childAges || null,
        extraBedFlags: this.params.extraBedFlags || null
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
    const extraBedAdults = this.extraBedAdults;
    const extraBedChildren = this.extraBedChildren;
    const payload = {
      selected_detail_id: detailId,
      rooms: Number(this.params.rooms || 1),
      adults: Number(this.params.adults || 0),
      children: Number(this.params.children || 0),
      childAges: this.params.childAges,
      extraBedFlags: this.params.extraBedFlags,
      free_children: this.freeChildren,
      extra_children_without_bed: this.paidChildNoBed,
      extra_bed_adults: extraBedAdults,
      extra_bed_children: extraBedChildren,

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
      },
      type: 'confirm'
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
    if (!this.canHoldBooking) {
      this.holdError = 'Hold booking is not available for this hotel';
      return;
    }
    const invId = Number(this.params.inventory_id || 0);
    const detailId = Number(this.params.selected_detail_id || 0);
    if (!invId || !detailId) {
      this.holdError = 'Missing inventory or detail selection';
      return;
    }
    const phoneControl = this.form.get('phone');
    if (!phoneControl || !phoneControl.valid || !phoneControl.value) {
      if (phoneControl) phoneControl.markAsTouched();
      this.holdError = 'Please enter contact phone before holding the booking';
      return;
    }

    const totalPrice =
      this.charges && typeof this.charges.final_total === 'number'
        ? this.charges.final_total
        : Number(this.params.price_total || 0);

    const holdType = String(this.inventory?.hold_type || '').toUpperCase();
    const holdValue = Number(this.inventory?.hold_value || 0);

    let holdAmount = 0;
    if (holdType === 'F') {
      const roomsCount = Number(this.params.rooms || 1);
      holdAmount = holdValue * (roomsCount > 0 ? roomsCount : 1);
    } else if (holdType === 'P') {
      holdAmount = (totalPrice * holdValue) / 100;
    }

    const holdLimitHours = Number(this.inventory?.hold_booking_limit ?? 0);
    const holdLimitText = this.formatHoldLimitHours(holdLimitHours);

    const holdValidDate = new Date(this.inventory?.hold_booking_date || '');
    const holdValidText = isNaN(holdValidDate.getTime())
      ? ''
      : `${String(holdValidDate.getDate()).padStart(2, '0')}-${String(
          holdValidDate.getMonth() + 1
        ).padStart(2, '0')}-${holdValidDate.getFullYear()}`;

    this.dialog
      .open(ConfirmDialogComponent, {
        width: '450px',
        data: {
          title: 'Hold Booking Confirmation',
          message: `Do you want to hold this booking for ${holdLimitText}?<br><br>Total Booking Amount: <strong>₹${totalPrice.toFixed(
            2
          )}</strong><br><br>Hold Charge: <strong>₹${holdAmount.toFixed(2)}</strong> (${holdType === 'F' ? 'Fixed amount (per room)' : holdValue + '% of total'})<br><br>Hold Valid Until: ${holdValidText}`,
          warningNote:
            'Note: If the booking is not completed within this time, the hold amount will not be refundable.',
          confirmText: 'Confirm Hold',
          cancelText: 'Cancel',
          useTextFormat: true
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.processHoldBooking(holdAmount);
        }
      });
  }

  private processHoldBooking(holdAmount: number) {
    if (this.holding) return;
    this.holding = true;
    const invId = Number(this.params.inventory_id || 0);
    const detailId = Number(this.params.selected_detail_id || 0);
    const v = this.form.value;
    const finalTotal =
      this.charges && typeof this.charges.final_total === 'number'
        ? this.charges.final_total
        : Number(this.params.price_total || 0);
    const extraBedAdults = this.extraBedAdults;
    const extraBedChildren = this.extraBedChildren;
    const payload = {
      selected_detail_id: detailId,
      rooms: Number(this.params.rooms || 1),
      adults: Number(this.params.adults || 0),
      children: Number(this.params.children || 0),
      childAges: this.params.childAges,
      extraBedFlags: this.params.extraBedFlags,
      free_children: this.freeChildren,
      extra_children_without_bed: this.paidChildNoBed,
      extra_bed_adults: extraBedAdults,
      extra_bed_children: extraBedChildren,
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
        lastName: g.lastName,
        age: g.age
      })),
      meta: {
        params: this.params,
        inventory: this.inventory,
        room_breakdowns: this.roomBreakdowns,
        charges: this.charges
      },
      hold_amount: holdAmount,
      customer_mobile: this.mobileNumberControl?.value || '',
      type: 'hold'
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

  private formatHoldLimitHours(hoursRaw: number): string {
    const hours = Number(hoursRaw || 0);
    if (!isFinite(hours) || hours <= 0) {
      return '0 hours';
    }
    if (hours <= 24) {
      const label = hours === 1 ? 'hour' : 'hours';
      return `${hours} ${label}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const dayLabel = days === 1 ? 'day' : 'days';
    if (remainingHours <= 0) {
      return `${days} ${dayLabel}`;
    }
    const hourLabel = remainingHours === 1 ? 'hour' : 'hours';
    return `${days} ${dayLabel} and ${remainingHours} ${hourLabel}`;
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
