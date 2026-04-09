import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { TravelerDetailsDialog } from '../../flights/special-flight-booking/traveler-details-dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-group-tour-book-trip',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './group-tour-book-trip.component.html'
})
export class GroupTourBookTripComponent implements OnInit {
  @ViewChild('installmentsDialog') installmentsDialogTpl!: TemplateRef<any>;
  selection: any = null;
  detail: any = null;
  travelersModel: {
    type: string;
    title: string;
    firstName: string;
    lastName: string;
    birthdate: string;
  }[] = [];
  cachedTravelers: any[] = [];
  isLoading = false;
  submitAttempted = false;
  contact = {
    profile: '',
    email: '',
    phone: '',
    city: '',
    agentReference: ''
  };
  itineraryId: number | null = null;
  installmentsDialogRef: MatDialogRef<any> | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    let stored: any = null;
    try {
      const raw = localStorage.getItem('group_tour_booking_selection');
      if (raw) {
        stored = JSON.parse(raw);
      }
    } catch {}
    this.selection = stored;

    const selCounts = stored || {};
    const adultsRaw = selCounts.adults;
    const childrenRaw = selCounts.children;
    let adultsCount =
      typeof adultsRaw === 'number' ? adultsRaw : Number(adultsRaw ?? 2);
    let childrenCount =
      typeof childrenRaw === 'number' ? childrenRaw : Number(childrenRaw ?? 0);
    if (!adultsCount || adultsCount < 1) {
      adultsCount = 1;
    }
    if (!childrenCount || childrenCount < 0) {
      childrenCount = 0;
    }
    this.travelersModel = [];
    for (let i = 0; i < adultsCount; i++) {
      this.travelersModel.push({
        type: 'Adult',
        title: '',
        firstName: '',
        lastName: '',
        birthdate: ''
      });
    }
    for (let i = 0; i < childrenCount; i++) {
      this.travelersModel.push({
        type: 'Child',
        title: '',
        firstName: '',
        lastName: '',
        birthdate: ''
      });
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (!id) {
      return;
    }
    this.itineraryId = id;

    const params: any = {};
    const sel = stored || {};
    if (sel.departure) {
      params.departure = sel.departure;
    }
    if (sel.date) {
      params.date = sel.date;
    }
    if (sel.rooms != null) {
      params.rooms = String(sel.rooms);
    }
    if (sel.adults != null) {
      params.adults = String(sel.adults);
    }
    if (sel.children != null) {
      params.children = String(sel.children);
    }
    if (Array.isArray(sel.childAges) && sel.childAges.length > 0) {
      params['child_ages[]'] = sel.childAges.map((a: any) => String(a));
    }
    if (Array.isArray(sel.extraBeds) && sel.extraBeds.length > 0) {
      params['extra_beds[]'] = sel.extraBeds.map((f: any) => String(f));
    }
    if (sel.transportationType) {
      params.transportationType = sel.transportationType;
    }
    if (sel.vehicle_id) {
      params.vehicle_id = String(sel.vehicle_id);
    }
    if (Array.isArray(sel.vehicles) && sel.vehicles.length > 0) {
      params.vehicle_ids = sel.vehicles
        .map((v: any) => v && v.id)
        .filter((v: any) => v)
        .map((v: any) => String(v));
    }
    if (Array.isArray(sel.sel_day_ids) && sel.sel_day_ids.length > 0) {
      params['sel_day_ids[]'] = sel.sel_day_ids.map((v: any) => String(v));
    }
    if (Array.isArray(sel.sel_hotel_ids) && sel.sel_hotel_ids.length > 0) {
      params['sel_hotel_ids[]'] = sel.sel_hotel_ids.map((v: any) => String(v));
    }
    if (Array.isArray(sel.sel_room_ids) && sel.sel_room_ids.length > 0) {
      params['sel_room_ids[]'] = sel.sel_room_ids.map((v: any) => String(v));
    }
    if (
      Array.isArray(sel.sel_meal_plan_ids) &&
      sel.sel_meal_plan_ids.length > 0
    ) {
      params['sel_meal_plan_ids[]'] = sel.sel_meal_plan_ids.map((v: any) =>
        String(v)
      );
    }

    const options: any = {};
    if (Object.keys(params).length > 0) {
      options.params = params;
    }

    this.http
      .get<any>(
        `${environment.apiUrl}/itineraries/${id}/selected-detail`,
        options
      )
      .subscribe({
        next: (res: any) => {
          const data = res && res.data ? res.data : res;
          this.detail = data;
        },
        error: () => {}
      });
  }

  getDefaultHotel(day: any): any {
    if (!day || !Array.isArray(day.hotels) || day.hotels.length === 0) {
      return null;
    }
    const def = day.hotels.find((h: any) => h && h.is_default);
    return def || day.hotels[0];
  }

  getDefaultRoomNameForDay(day: any): string {
    if (!day || !Array.isArray(day.hotels) || !day.hotels.length) {
      return '';
    }
    const hotels = day.hotels as any[];
    const defaultHotelId =
      typeof day.default_hotel_id === 'number' ? day.default_hotel_id : null;
    const hotel =
      (defaultHotelId !== null &&
        hotels.find((h) => h && h.id === defaultHotelId)) ||
      hotels.find((h) => h && h.is_default) ||
      hotels[0];
    if (!hotel || !Array.isArray(hotel.rooms) || !hotel.rooms.length) {
      return '';
    }
    const rooms = hotel.rooms as any[];
    const defaultRoomId =
      typeof day.default_room_id === 'number'
        ? day.default_room_id
        : hotel && typeof hotel.default_room_id === 'number'
          ? hotel.default_room_id
          : null;
    const room =
      (defaultRoomId !== null &&
        rooms.find((r) => r && r.room_id === defaultRoomId)) ||
      rooms.find((r) => r && r.is_default_meal_plan) ||
      rooms[0];
    return room && room.room_name ? room.room_name : '';
  }

  getDefaultMealPlanNameForDay(day: any): string {
    if (!day || !Array.isArray(day.hotels) || !day.hotels.length) {
      return '';
    }
    const hotels = day.hotels as any[];
    const defaultHotelId =
      typeof day.default_hotel_id === 'number' ? day.default_hotel_id : null;
    const hotel =
      (defaultHotelId !== null &&
        hotels.find((h) => h && h.id === defaultHotelId)) ||
      hotels.find((h) => h && h.is_default) ||
      hotels[0];
    if (!hotel || !Array.isArray(hotel.rooms) || !hotel.rooms.length) {
      return '';
    }
    const rooms = hotel.rooms as any[];
    const defaultRoomId =
      typeof day.default_room_id === 'number'
        ? day.default_room_id
        : hotel && typeof hotel.default_room_id === 'number'
          ? hotel.default_room_id
          : null;
    const defaultMealId =
      typeof day.default_meal_plan_id === 'number'
        ? day.default_meal_plan_id
        : hotel && typeof hotel.default_meal_plan_id === 'number'
          ? hotel.default_meal_plan_id
          : null;
    const room =
      (defaultRoomId !== null &&
        rooms.find((r) => r && r.room_id === defaultRoomId)) ||
      rooms.find((r) => r && r.is_default_meal_plan) ||
      rooms.find((r) => {
        if (!r || !Array.isArray(r.meal_plan_ids)) {
          return false;
        }
        return (
          defaultMealId !== null &&
          r.meal_plan_ids.includes(defaultMealId as number)
        );
      }) ||
      rooms[0];
    if (!room || !Array.isArray(room.meal_plans)) {
      return '';
    }
    const meal =
      (defaultMealId !== null &&
        room.meal_plans.find((m: any) => m && m.id === defaultMealId)) ||
      room.meal_plans[0];
    return meal && meal.name ? meal.name : '';
  }

  fetchDetailsByMobile(mobileRaw: string): void {
    const mobile = (mobileRaw || '').toString().trim();
    const digitsOnly = mobile.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 7) {
      this.toastr.warning('Please enter a valid mobile number.');
      return;
    }

    this.isLoading = true;
    this.http
      .post(`${environment.apiUrl}/orders/fetch-details-by-mobile`, {
        customer_mobile: mobile
      })
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response && response.success && response.data) {
            const travelers = Array.isArray(response.data)
              ? response.data.map((d: any) => ({
                  type: d.type || 'Adult',
                  title: d.title,
                  firstName: d.first_name ?? d.firstName,
                  lastName: d.last_name ?? d.lastName,
                  birthdate: d.birthdate ?? d.dob ?? ''
                }))
              : [
                  {
                    type: 'Adult',
                    title: response.data.title,
                    firstName: response.data.first_name,
                    lastName: response.data.last_name,
                    birthdate:
                      response.data.birthdate ?? response.data.dob ?? ''
                  }
                ];
            this.cachedTravelers = travelers;
            this.openTravelerPickerFromCached();
          } else {
            this.toastr.info(
              (response && response.message) ||
                'No traveler details found for this mobile number.'
            );
          }
        },
        error: () => {
          this.isLoading = false;
          this.toastr.error('Failed to fetch traveler details.');
        }
      });
  }

  openTravelerPicker(index: number): void {
    if (!this.cachedTravelers || this.cachedTravelers.length === 0) {
      this.toastr.info('Please fetch traveler details by mobile first.');
      return;
    }
    const required = {
      adult: 1,
      child: 0,
      infant: 0
    };
    const dialogRef = this.dialog.open(TravelerDetailsDialog, {
      data: { travelers: this.cachedTravelers, required, type: 'group-tour' }
    });
    dialogRef.afterClosed().subscribe((selected: any[]) => {
      if (
        Array.isArray(selected) &&
        selected.length &&
        this.travelersModel[index]
      ) {
        const t = selected[0];
        this.travelersModel[index].type =
          t.type || this.travelersModel[index].type;
        this.travelersModel[index].title = t.title || '';
        this.travelersModel[index].firstName = t.firstName || '';
        this.travelersModel[index].lastName = t.lastName || '';
      }
    });
  }

  private openTravelerPickerFromCached(): void {
    if (!this.cachedTravelers || this.cachedTravelers.length === 0) {
      return;
    }
    const required = {
      adult: this.selection?.adults || 0,
      child: this.selection?.children || 0,
      infant: 0
    };
    const dialogRef = this.dialog.open(TravelerDetailsDialog, {
      data: { travelers: this.cachedTravelers, required, type: 'group-tour' }
    });
    dialogRef.afterClosed().subscribe((selected: any[]) => {
      if (Array.isArray(selected) && selected.length) {
        selected.forEach((t: any, index: number) => {
          if (!this.travelersModel[index]) {
            return;
          }
          this.travelersModel[index].type =
            t.type || this.travelersModel[index].type;
          this.travelersModel[index].title = t.title || '';
          this.travelersModel[index].firstName = t.firstName || '';
          this.travelersModel[index].lastName = t.lastName || '';
          this.travelersModel[index].birthdate = t.birthdate || '';
        });
      }
    });
  }

  goBackToDetail(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/holiday/group-tour']);
      return;
    }
    this.router.navigate(['/holiday/group-tour', id], {
      queryParams: this.route.snapshot.queryParams
    });
  }

  private buildItineraryBookingPayload(
    typeParam: 'hold' | 'confirm',
    useInstallments: boolean
  ): any | null {
    this.submitAttempted = true;
    if (!this.detail || !this.detail.pricing) {
      this.toastr.error('Pricing details are not available.');
      return null;
    }

    for (const t of this.travelersModel) {
      if (
        !t.title ||
        !t.firstName ||
        !t.lastName ||
        (t.type === 'Child' && !t.birthdate)
      ) {
        this.toastr.error('Please fill all traveler details.');
        return null;
      }
    }

    const email = (this.contact.email || '').trim();
    const phone = (this.contact.phone || '').trim();
    const city = (this.contact.city || '').trim();
    if (!email || !phone || !city) {
      this.toastr.error('Please fill all required contact information.');
      return null;
    }

    const pricing = this.detail.pricing;
    const itineraryId = this.itineraryId || this.detail.id;

    if (!itineraryId) {
      this.toastr.error('Itinerary information is missing.');
      return null;
    }

    const travelDate = pricing.travel_date || this.selection?.date || null;
    const departureId = pricing.departure_id || null;
    const departureFrom =
      pricing.departure || this.selection?.departure || null;

    if (!travelDate || !departureId || !departureFrom) {
      this.toastr.error('Travel details are incomplete.');
      return null;
    }

    const rooms = this.selection?.rooms ?? pricing.rooms ?? 1;
    const adults =
      this.selection?.adults ??
      pricing.adults ??
      this.travelersModel.filter((t) => t.type === 'Adult').length;
    const children =
      this.selection?.children ??
      pricing.children ??
      this.travelersModel.filter((t) => t.type === 'Child').length;

    const extraBedFlags = Array.isArray(this.selection?.extraBeds)
      ? this.selection.extraBeds
      : [];
    const extraBedChildren = extraBedFlags.filter(
      (v: any) =>
        v === 1 || v === '1' || v === true || v === 'true' || v === 'TRUE'
    ).length;
    const extraBedAdults = 0;

    if (
      !pricing.vehicles_selected ||
      !Array.isArray(pricing.vehicles_selected)
    ) {
      this.toastr.error('Vehicle selection is missing.');
      return null;
    }

    if (!this.travelersModel.length) {
      this.toastr.error('No traveler details found.');
      return null;
    }

    const mainTraveler = this.travelersModel[0];
    const otherGuests = this.travelersModel.slice(1).map((t) => ({
      type: t.type,
      title: t.title,
      firstName: t.firstName,
      lastName: t.lastName,
      birthdate: t.birthdate || null
    }));

    const payload: any = {
      itinerary_id: itineraryId,
      travel_date: travelDate,
      departure_id: departureId,
      departure_from: departureFrom,
      rooms,
      adults,
      children,
      extra_bed_adults: extraBedAdults,
      extra_bed_children: extraBedChildren,
      pricing,
      sel_day_ids:
        Array.isArray(this.selection?.sel_day_ids) &&
        this.selection.sel_day_ids.length
          ? this.selection.sel_day_ids
          : [],
      sel_hotel_ids:
        Array.isArray(this.selection?.sel_hotel_ids) &&
        this.selection.sel_hotel_ids.length
          ? this.selection.sel_hotel_ids
          : [],
      sel_room_ids:
        Array.isArray(this.selection?.sel_room_ids) &&
        this.selection.sel_room_ids.length
          ? this.selection.sel_room_ids
          : [],
      sel_meal_plan_ids:
        Array.isArray(this.selection?.sel_meal_plan_ids) &&
        this.selection.sel_meal_plan_ids.length
          ? this.selection.sel_meal_plan_ids
          : [],
      contact: {
        email,
        phone,
        city: this.contact.city || '',
        profile: this.contact.profile || '',
        agentReference: this.contact.agentReference || ''
      },
      guest: {
        type: mainTraveler.type,
        title: mainTraveler.title,
        firstName: mainTraveler.firstName,
        lastName: mainTraveler.lastName,
        birthdate: mainTraveler.birthdate || null
      },
      other_guests: otherGuests,
      type: typeParam
    };

    if (typeParam === 'confirm' && useInstallments) {
      payload.installment_flag = 1;
    }

    return payload;
  }

  onPayNow(useInstallments = false): void {
    const payload = this.buildItineraryBookingPayload(
      'confirm',
      useInstallments
    );
    if (!payload) {
      return;
    }

    this.isLoading = true;
    this.http
      .post<any>(`${environment.apiUrl}/itineraries/confirm-booking`, payload)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          const success = res && (res.success === true || res.status === true);
          if (!success || !res.data || !res.data.order_id) {
            this.toastr.error(
              res && res.message
                ? res.message
                : 'Failed to create itinerary booking.'
            );
            return;
          }
          this.toastr.success(
            res.message || 'Itinerary booking confirmed. Proceeding to payment.'
          );
          if (this.installmentsDialogRef) {
            this.installmentsDialogRef.close();
            this.installmentsDialogRef = null;
          }
          const orderId = res.data.order_id;
          this.router.navigate(['/flights/payment', orderId]);
        },
        error: () => {
          this.isLoading = false;
          this.toastr.error('Failed to create itinerary booking.');
        }
      });
  }

  get canShowHoldButton(): boolean {
    const d = this.detail;

    if (!d) {
      return false;
    }

    const allowRaw =
      (d as any).allow_hold_booking ?? (d as any).allowHoldBooking;

    console.log(allowRaw);
    const allowBool =
      allowRaw === true ||
      allowRaw === 1 ||
      allowRaw === '1' ||
      allowRaw === 'true' ||
      allowRaw === 'TRUE';

    if (!allowBool) {
      return false;
    }

    let holdDateStr: string | null =
      (d as any).hold_booking_date ?? (d as any).holdBookingDate ?? null;

    if (!holdDateStr) {
      const holdDaysRaw =
        (d as any).hold_booking_days ?? (d as any).holdBookingDays;
      const holdDays =
        holdDaysRaw != null && holdDaysRaw !== '' ? Number(holdDaysRaw) : null;

      const pricing = (d as any).pricing || {};
      const travelDateStr: string | null =
        pricing.travel_date ??
        this.selection?.date ??
        (d as any).fitStart ??
        null;

      if (holdDays != null && !isNaN(holdDays) && travelDateStr) {
        const travelDate = new Date(travelDateStr);
        if (isFinite(travelDate.getTime())) {
          const cutOff = new Date(travelDate.getTime());
          cutOff.setDate(cutOff.getDate() - holdDays);
          holdDateStr = cutOff.toISOString();
        }
      }
    }

    if (!holdDateStr) {
      return allowBool;
    }

    const holdDate = new Date(holdDateStr);
    if (!isFinite(holdDate.getTime())) {
      return allowBool;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    holdDate.setHours(23, 59, 59, 999);

    return today.getTime() <= holdDate.getTime();
  }

  onHoldNow(): void {
    const payload = this.buildItineraryBookingPayload('hold', false);
    if (!payload) {
      return;
    }

    const d = this.detail;
    if (!d) {
      this.toastr.error('Itinerary details are not available.');
      return;
    }

    const pricing = payload.pricing || {};
    const totalRaw =
      pricing.totalPrice ??
      pricing.fromPrice ??
      pricing.total ??
      pricing.total_price;
    const totalPrice = Number(totalRaw || 0) || 0;

    const holdType = (d as any).hold_type;
    const holdValueRaw = (d as any).hold_value;
    const holdValue =
      typeof holdValueRaw === 'number'
        ? holdValueRaw
        : holdValueRaw != null
          ? Number(holdValueRaw)
          : 0;

    if (!totalPrice || !holdType || !holdValue) {
      this.toastr.error('Hold booking details are not configured.');
      return;
    }

    let holdAmount = 0;
    if (holdType === 'F') {
      holdAmount = holdValue;
    } else if (holdType === 'P') {
      holdAmount = (totalPrice * holdValue) / 100;
    }

    const holdLimitHoursRaw = (d as any).hold_booking_limit;
    const holdLimitHours =
      holdLimitHoursRaw != null ? Number(holdLimitHoursRaw) : 0;
    const holdLimitText = this.formatHoldLimitHours(holdLimitHours);

    const now = new Date();
    const holdValidDate = isFinite(holdLimitHours)
      ? new Date(now.getTime() + holdLimitHours * 60 * 60 * 1000)
      : now;
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
          message: `Do you want to hold this booking for ${holdLimitText}?<br><br>Total Package Amount: <strong>₹${totalPrice.toFixed(
            2
          )}</strong><br><br>Hold Charge: <strong>₹${holdAmount.toFixed(
            2
          )}</strong> (${
            holdType === 'F' ? 'Fixed amount' : holdValue + '% of total'
          })<br><br>Hold Valid Until: ${holdValidText}`,
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
          this.isLoading = true;
          this.http
            .post<any>(
              `${environment.apiUrl}/itineraries/confirm-booking`,
              payload
            )
            .subscribe({
              next: (res) => {
                this.isLoading = false;
                const success =
                  res && (res.success === true || res.status === true);
                if (!success || !res.data || !res.data.order_id) {
                  this.toastr.error(
                    res && res.message
                      ? res.message
                      : 'Failed to create itinerary hold booking.'
                  );
                  return;
                }
                this.toastr.success(
                  res.message ||
                    'Itinerary booking held. Proceeding to payment.'
                );
                const orderId = res.data.order_id;
                this.router.navigate(['/flights/payment', orderId]);
              },
              error: () => {
                this.isLoading = false;
                this.toastr.error('Failed to create itinerary hold booking.');
              }
            });
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

  get hasInstallmentPlan(): boolean {
    const d = this.detail;
    return !!(
      d &&
      d.allowInstallmentPayment &&
      Array.isArray(d.installments) &&
      d.installments.length &&
      d.pricing
    );
  }

  openInstallmentsDialog(): void {
    if (!this.hasInstallmentPlan || !this.installmentsDialogTpl) {
      return;
    }
    const d = this.detail;
    const pricing = d.pricing || {};
    const totalRaw =
      pricing.totalPrice ??
      pricing.fromPrice ??
      pricing.total ??
      pricing.total_price;
    const totalPrice = Number(totalRaw || 0) || 0;
    const baseDate = new Date();
    let cumulativeDays = 0;
    const installments = (d.installments as any[]).map(
      (ins: any, idx: number) => {
        const days =
          Number(ins.days_after_previous ?? ins.daysAfterPrevious ?? 0) || 0;
        cumulativeDays += days;
        const dueDate = new Date(
          baseDate.getTime() + cumulativeDays * 24 * 60 * 60 * 1000
        );
        const percentage = Number(ins.percentage ?? 0) || 0;
        const amount = totalPrice ? (totalPrice * percentage) / 100 : 0;
        return {
          number: ins.number ?? idx + 1,
          daysAfterPrevious: days,
          cumulativeDays,
          dueDate,
          percentage,
          amount
        };
      }
    );
    this.installmentsDialogRef = this.dialog.open(this.installmentsDialogTpl, {
      data: {
        totalPrice,
        baseDate,
        installments
      }
    });
  }

  getFirstInstallmentAmount(): number | null {
    if (!this.detail || !this.detail.pricing) {
      return null;
    }
    const installments = Array.isArray(this.detail.installments)
      ? this.detail.installments
      : [];
    if (!installments.length) {
      return null;
    }
    const first = installments[0];
    const totalRaw =
      this.detail.pricing.totalPrice ??
      this.detail.pricing.fromPrice ??
      this.detail.pricing.total ??
      this.detail.pricing.total_price;
    const totalPrice = Number(totalRaw || 0) || 0;
    const percentage = Number(first.percentage ?? 0) || 0;
    if (!totalPrice || !percentage) {
      return null;
    }
    return (totalPrice * percentage) / 100;
  }

  private getVehicleById(id: number): any {
    const list =
      this.detail && Array.isArray(this.detail.vehicles)
        ? this.detail.vehicles
        : [];
    return list.find((v: any) => {
      if (!v) {
        return false;
      }
      const vid = v.id ?? v.vehicle_id;
      return Number(vid) === Number(id);
    });
  }

  getVehicleName(id: number): string | null {
    const v = this.getVehicleById(id);
    if (!v) {
      return null;
    }
    return v.name || v.vehicle_name || null;
  }

  getVehicleType(id: number): string | null {
    const v = this.getVehicleById(id);
    if (!v) {
      return null;
    }
    return v.type || null;
  }

  getVehicleImage(id: number): string | null {
    const v = this.getVehicleById(id);
    if (!v || !v.photo) {
      return null;
    }
    let path = v.photo;
    if (typeof path === 'string' && path.startsWith('/')) {
      path = path.substring(1);
    }
    return `${environment.imgUrl}${path}`;
  }
}
