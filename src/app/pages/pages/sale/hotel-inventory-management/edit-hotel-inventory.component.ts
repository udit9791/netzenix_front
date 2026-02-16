import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
  AbstractControl,
  FormControl
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { HotelOptionService } from '../../../../services/hotel-option.service';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'vex-edit-hotel-inventory',
  templateUrl: './edit-hotel-inventory.component.html',
  styleUrls: ['./edit-hotel-inventory.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    MatSnackBarModule,
    RouterModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class EditHotelInventoryComponent implements OnInit {
  form!: FormGroup;
  inventoryId: number | null = null;
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  hotels: any[] = [];
  hotelDetails: any | null = null;
  hotelForLocation: any | null = null;
  selectedCountryId: number | null = null;
  selectedStateId: number | null = null;
  selectedCityId: number | null = null;
  selectedCityName: string = '';
  mealOptions: any[] = [];
  rooms: any[] = [];
  saving = false;
  minDate: Date = new Date();
  mode: 'confirm' | 'normal' = 'normal';

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private hotelService: HotelService,
    private optionService: HotelOptionService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      countryId: [null, Validators.required],
      stateId: [{ value: null, disabled: true }, Validators.required],
      cityId: [{ value: null, disabled: true }, Validators.required],
      hotelId: [null, Validators.required],
      checkinTime: ['', Validators.required],
      checkoutTime: ['', Validators.required],
      extraCosts: this.fb.group({
        childAgeFrom: [null],
        childAgeTo: [null],
        childWithBedAgeFrom: [null],
        childWithBedAgeTo: [null]
      }),
      isRefundable: ['non-refundable', Validators.required],
      fareRules: this.fb.array([]),
      allowHoldBooking: [false],
      holdBookingType: ['percentage'],
      holdBookingAmount: [null],
      holdBookingCutOffDays: [null],
      holdBookingLimit: [null],
      blackoutDates: this.fb.array([]),
      blackoutDateInput: [null],
      roomDetails: this.fb.array([])
    });

    this.minDate.setHours(0, 0, 0, 0);

    const idStr = this.route.snapshot.queryParamMap.get('inventory_id');
    const invId = idStr ? Number(idStr) : 0;
    this.inventoryId = invId || null;

    this.loadCountries();
    this.loadMealOptions();

    if (invId) {
      this.hotelService.getHotelInventoryById(invId).subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          this.prefillFromInventory(data);
        },
        error: () => {}
      });
    }

    this.form.get('hotelId')?.valueChanges.subscribe((id: number) => {
      if (!id) return;
      this.hotelService.getHotelById(id).subscribe({
        next: (res: any) => {
          const payload = res?.data ?? res;
          const h = payload?.hotel ?? payload;
          this.hotelDetails = h || null;
        },
        error: () => {}
      });
    });
  }

  get fareRules(): FormArray {
    return this.form.get('fareRules') as FormArray;
  }

  get roomDetails(): FormArray {
    return this.form.get('roomDetails') as FormArray;
  }

  get blackoutDates(): FormArray {
    return this.form.get('blackoutDates') as FormArray;
  }

  getRoomGroup(roomId: number): FormGroup {
    const arr = this.roomDetails;
    const target = String(roomId);
    const ctrl = arr.controls.find(
      (c: AbstractControl) =>
        String((c as FormGroup).get('roomId')?.value) === target
    ) as FormGroup | undefined;
    return (
      ctrl ||
      this.fb.group({
        roomId: [roomId],
        extraCosts: this.fb.group({})
      })
    );
  }

  buildRoomDetailsControls(rooms: any[]): void {
    const arr = this.roomDetails;
    while (arr.length) arr.removeAt(0);
    rooms.forEach((r) => {
      arr.push(
        this.fb.group({
          roomId: [r?.room_id],
          extraCosts: this.fb.group({})
        })
      );
    });
  }

  roomById(roomId: number): any | null {
    const target = String(roomId);
    return (
      (this.rooms || []).find((r: any) => String(r?.room_id) === target) || null
    );
  }

  loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
        if (this.hotelForLocation) {
          this.applyHotelLocationFromDetails(this.hotelForLocation);
        }
      },
      error: () => {}
    });
  }

  onCountryChange(id: number): void {
    if (!id) return;
    this.form.get('stateId')?.enable();
    this.userService.getStatesByCountry(id).subscribe({
      next: (res: any) => {
        this.states = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
  }

  onStateChange(id: number): void {
    if (!id) return;
    this.form.get('cityId')?.enable();
    this.userService.getCitiesByState(id).subscribe({
      next: (res: any) => {
        this.cities = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
  }

  onCityChange(id: number): void {
    if (!id) return;
    this.loadHotelsForDropdown(id);
  }

  loadHotelsForDropdown(
    cityId: number,
    autoSelectHotel?: boolean,
    hotelIdToSelect?: number
  ): void {
    this.hotelService
      .searchHotelsAutocomplete(
        '',
        100,
        cityId,
        this.selectedStateId ?? undefined,
        this.selectedCountryId ?? undefined
      )
      .subscribe({
        next: (rows) => {
          const list = Array.isArray((rows as any)?.data)
            ? (rows as any).data
            : Array.isArray(rows)
              ? (rows as any)
              : [];
          this.hotels = list;
          if (autoSelectHotel && hotelIdToSelect) {
            const match = list.find(
              (h: any) => Number(h.id) === Number(hotelIdToSelect)
            );
            if (match) {
              this.form.patchValue({ hotelId: hotelIdToSelect });
              this.form.get('hotelId')?.disable({ emitEvent: false });
            }
          }
        },
        error: () => {}
      });
  }

  applyHotelLocationFromDetails(h: any): void {
    if (!h) return;
    this.hotelForLocation = h;
    if (!this.countries || !this.countries.length) return;
    const countryName =
      h.country_name ||
      h.country ||
      h.location?.country ||
      h.city_country ||
      '';
    const stateName =
      h.state_name || h.state || h.location?.state || h.city_state || '';
    const cityName =
      h.city_name || h.city || h.location?.city || this.selectedCityName || '';
    const norm = (v: any) =>
      String(v || '')
        .trim()
        .toLowerCase();
    if (!countryName && !stateName && !cityName) return;
    const country = this.countries.find(
      (c: any) => norm(c.name) === norm(countryName)
    );
    if (!country) return;
    const countryId = Number(country.id) || null;
    this.selectedCountryId = countryId;
    if (countryId) {
      this.form.patchValue({ countryId });
    }
    this.form.get('countryId')?.disable({ emitEvent: false });
    if (!countryId) return;
    this.userService.getStatesByCountry(countryId).subscribe({
      next: (sres: any) => {
        this.states = Array.isArray(sres) ? sres : sres?.data ? sres.data : [];
        const state =
          this.states.find((s: any) => norm(s.name) === norm(stateName)) ||
          null;
        const stateId = state ? Number(state.id) : null;
        this.selectedStateId = stateId;
        if (stateId) {
          this.form.patchValue({ stateId });
        }
        this.form.get('stateId')?.disable({ emitEvent: false });
        if (!stateId) return;
        this.userService.getCitiesByState(stateId).subscribe({
          next: (cres: any) => {
            this.cities = Array.isArray(cres)
              ? cres
              : cres?.data
                ? cres.data
                : [];
            const city =
              this.cities.find((c: any) => norm(c.name) === norm(cityName)) ||
              null;
            const cityId = city ? Number(city.id) : null;
            this.selectedCityId = cityId;
            if (cityId) {
              this.form.patchValue({ cityId });
            }
            this.form.get('cityId')?.disable({ emitEvent: false });
            const hid = h.id || h.hotel_id || h.hotelId;
            if (cityId && hid) {
              this.loadHotelsForDropdown(cityId, true, Number(hid));
            } else if (hid) {
              this.form.patchValue({ hotelId: Number(hid) });
              this.form.get('hotelId')?.disable({ emitEvent: false });
            }
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  loadMealOptions(): void {
    this.optionService.getActiveOptions('meal_option').subscribe({
      next: (res: any) => {
        this.mealOptions = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
  }

  mealKeys(): { key: string; label: string }[] {
    const arr =
      Array.isArray(this.mealOptions) && this.mealOptions.length
        ? this.mealOptions.map((m: any) => ({
            key: `meal_${m.id}`,
            label: m.name
          }))
        : [
            { key: 'AL', label: 'AL' },
            { key: 'AP', label: 'AP' },
            { key: 'CP', label: 'CP' },
            { key: 'MAP', label: 'MAP' },
            { key: 'Room only', label: 'Room only' }
          ];
    return arr;
  }

  isNonEmptyNumeric(val: any): boolean {
    const s = String(val ?? '').trim();
    return !!s && /^\d+$/.test(s);
  }

  ageOptions(): number[] {
    return Array.from({ length: 17 }, (_, i) => i + 1);
  }

  trackByMeal(index: number, mk: { key: string }): string {
    return mk.key;
  }

  getSelectedMealKeys(roomId: number): {
    key: string;
    label: string;
  }[] {
    return this.mealKeys();
  }

  buildRoomExtraCostsControls(): void {
    const keys = this.mealKeys().map((m) => m.key);
    if (!keys.length) return;
    this.roomDetails.controls.forEach((ctrl) => {
      const roomGrp = ctrl as FormGroup;
      let extra = roomGrp.get('extraCosts') as FormGroup | null;
      if (!extra) {
        extra = this.fb.group({});
        roomGrp.addControl('extraCosts', extra);
      }
      const ensureDay = (day: 'weekday' | 'weekend') => {
        let dayGrp = extra!.get(day) as FormGroup | null;
        if (!dayGrp) {
          dayGrp = this.fb.group({});
          extra!.addControl(day, dayGrp);
        }
        ['adult', 'child', 'child_with_bed'].forEach((kind) => {
          let kindGrp = dayGrp!.get(kind) as FormGroup | null;
          if (!kindGrp) {
            kindGrp = this.fb.group({});
            dayGrp!.addControl(kind, kindGrp);
          }
          keys.forEach((mk) => {
            if (!kindGrp!.get(mk)) {
              kindGrp!.addControl(
                mk,
                this.fb.control(null, [
                  Validators.pattern(/^\d+$/),
                  Validators.min(0)
                ])
              );
            }
          });
        });
      };
      ensureDay('weekday');
      ensureDay('weekend');
    });
  }

  roomExtraCostCtrl(
    roomId: number,
    day: 'weekday' | 'weekend',
    kind: 'adult' | 'child' | 'child_with_bed',
    mealKey: string
  ): FormControl {
    const grp = this.getRoomGroup(roomId);
    const extra = grp.get('extraCosts') as FormGroup | null;
    const dayGrp = extra?.get(day) as FormGroup | null;
    const kindGrp = dayGrp?.get(kind) as FormGroup | null;
    return (
      (kindGrp?.get(mealKey) as FormControl) ||
      (this.fb.control(null) as FormControl)
    );
  }

  mealIdForKey(key: string, label: string): number | null {
    if (key && key.startsWith('meal_')) {
      const n = Number(key.replace('meal_', ''));
      return isNaN(n) ? null : n;
    }
    const opt = (this.mealOptions || []).find(
      (o: any) =>
        String(o?.name || '').toLowerCase() ===
        String(label || '').toLowerCase()
    );
    const id = opt?.id ? Number(opt.id) : null;
    return id && !isNaN(id) ? id : null;
  }

  getExtraCostsPayload(): any {
    const extra = this.form.get('extraCosts') as FormGroup;
    const out: any = {};
    const childAgeFrom = (extra?.get('childAgeFrom') as FormControl | null)
      ?.value;
    const childAgeTo = (extra?.get('childAgeTo') as FormControl | null)?.value;
    const childWithBedAgeFrom = (
      extra?.get('childWithBedAgeFrom') as FormControl | null
    )?.value;
    const childWithBedAgeTo = (
      extra?.get('childWithBedAgeTo') as FormControl | null
    )?.value;
    const normalize = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      if (!s) return null;
      const n = Number(s);
      return isNaN(n) ? null : n;
    };
    const caFrom = normalize(childAgeFrom);
    const caTo = normalize(childAgeTo);
    const cwbFrom = normalize(childWithBedAgeFrom);
    const cwbTo = normalize(childWithBedAgeTo);
    if (caFrom !== null) {
      out.child_age_from = caFrom;
    }
    if (caTo !== null) {
      out.child_age_to = caTo;
    }
    if (cwbFrom !== null) {
      out.child_with_bed_age_from = cwbFrom;
    }
    if (cwbTo !== null) {
      out.child_with_bed_age_to = cwbTo;
    }
    return out;
  }

  getRoomExtraCostsPayload(roomId: number): any | null {
    const grp = this.getRoomGroup(roomId);
    const extra = grp.get('extraCosts') as FormGroup | null;
    if (!extra) return null;
    const mealList = this.mealKeys();
    const out: any = {};
    const collectForDay = (day: 'weekday' | 'weekend') => {
      const dayGrp = extra.get(day) as FormGroup | null;
      if (!dayGrp) return;
      const dayOut: any = {};
      (['adult', 'child', 'child_with_bed'] as const).forEach((kind) => {
        const kindGrp = dayGrp.get(kind) as FormGroup | null;
        if (!kindGrp) return;
        const entries: any[] = [];
        mealList.forEach((mk) => {
          const ctrl = kindGrp.get(mk.key) as FormControl | null;
          const val = ctrl?.value;
          if (this.isNonEmptyNumeric(val)) {
            entries.push({
              meal_type: this.mealIdForKey(mk.key, mk.label),
              amount: Number(val)
            });
          }
        });
        if (entries.length) dayOut[kind] = entries;
      });
      if (Object.keys(dayOut).length) out[day] = dayOut;
    };
    collectForDay('weekday');
    collectForDay('weekend');
    return Object.keys(out).length ? out : null;
  }

  dateToStr(d: any): string {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const day = dt.getDate();
    const mm = m < 10 ? `0${m}` : String(m);
    const dd = day < 10 ? `0${day}` : String(day);
    return `${y}-${mm}-${dd}`;
  }

  formatDateStr(v: any): string {
    if (!v) return '-';
    if (v instanceof Date) {
      const s = this.dateToStr(v);
      const mm = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return mm ? `${mm[3]}-${mm[2]}-${mm[1]}` : s;
    }
    const s = String(v);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(s);
    const ds = this.dateToStr(d);
    const md = ds.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return md ? `${md[3]}-${md[2]}-${md[1]}` : ds;
  }

  onBlackoutDateSelected(val: any): void {
    if (!val) return;
    const s = this.dateToStr(val);
    const exists = (this.blackoutDates.value as any[]).includes(s);
    if (exists) {
      this.snackBar.open('Blackout date already added', 'Close', {
        duration: 2000
      });
      this.form.patchValue({ blackoutDateInput: null });
      return;
    }
    this.blackoutDates.push(this.fb.control(s));
    this.form.patchValue({ blackoutDateInput: null });
  }

  removeBlackoutDate(index: number): void {
    const arr = this.blackoutDates;
    if (index >= 0 && index < arr.length) arr.removeAt(index);
  }

  addFareRule(): void {
    this.fareRules.push(
      this.fb.group({
        days: [null, [Validators.required, Validators.min(1)]],
        amount: [null, [Validators.required, Validators.min(0)]]
      })
    );
  }

  removeFareRule(index: number): void {
    if (index < 0 || index >= this.fareRules.length) return;
    this.fareRules.removeAt(index);
  }

  prefillFromInventory(data: any): void {
    const inv = data?.inventory;
    const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
    if (!inv) return;
    this.rooms = rooms;
    const invHotelId = inv.hotel_id ?? inv.hotelId;
    if (invHotelId) {
      this.form.patchValue({ hotelId: Number(invHotelId) });
      this.hotelService.getHotelById(Number(invHotelId)).subscribe({
        next: (res: any) => {
          const payload = res?.data ?? res;
          const h = payload?.hotel ?? payload;
          this.hotelDetails = h || null;
          this.applyHotelLocationFromDetails(h);
        },
        error: () => {}
      });
    }
    this.form.patchValue({
      checkinTime: inv.check_in_time || '',
      checkoutTime: inv.check_out_time || ''
    });

    const invExtra = inv.extra_costs || inv.extraCosts || null;
    if (invExtra) {
      const extraPatch: any = {};
      if (invExtra.child_age_from != null) {
        extraPatch.childAgeFrom = invExtra.child_age_from;
      }
      if (invExtra.child_age_to != null) {
        extraPatch.childAgeTo = invExtra.child_age_to;
      }
      if (invExtra.child_with_bed_age_from != null) {
        extraPatch.childWithBedAgeFrom = invExtra.child_with_bed_age_from;
      }
      if (invExtra.child_with_bed_age_to != null) {
        extraPatch.childWithBedAgeTo = invExtra.child_with_bed_age_to;
      }
      if (Object.keys(extraPatch).length) {
        this.form.patchValue({
          extraCosts: extraPatch
        });
      }
    }

    const isRef = inv.is_refundable;
    const isRefVal =
      isRef === true || isRef === 1 || isRef === '1'
        ? 'refundable'
        : 'non-refundable';
    this.form.patchValue({
      isRefundable: isRefVal
    });

    const rules = Array.isArray(inv.refund_rules)
      ? inv.refund_rules
      : Array.isArray(inv.refundRules)
        ? inv.refundRules
        : [];
    while (this.fareRules.length) {
      this.fareRules.removeAt(0);
    }
    if (isRefVal === 'refundable' && rules.length) {
      rules.forEach((r: any) => {
        const days =
          r.days_before_checkin != null
            ? r.days_before_checkin
            : r.days != null
              ? r.days
              : null;
        const amount =
          r.amount != null
            ? r.amount
            : r.refundable_amount != null
              ? r.refundable_amount
              : null;
        this.fareRules.push(
          this.fb.group({
            days: [days, [Validators.required, Validators.min(1)]],
            amount: [amount, [Validators.required, Validators.min(0)]]
          })
        );
      });
    }

    const allowHold = inv.allow_hold_booking ?? inv.allowHoldBooking;
    const holdType = inv.hold_type ?? inv.holdType;
    const holdValue = inv.hold_value ?? inv.holdValue;
    const holdDays = inv.hold_booking_days ?? inv.holdBookingDays;
    const holdLimit = inv.hold_booking_limit ?? inv.holdBookingLimit;
    const holdTypeForm =
      holdType === 'F' || holdType === 'flat' ? 'flat' : 'percentage';
    this.form.patchValue({
      allowHoldBooking: !!allowHold,
      holdBookingType: holdTypeForm,
      holdBookingAmount: holdValue != null ? Number(holdValue) : null,
      holdBookingCutOffDays: holdDays != null ? Number(holdDays) : null,
      holdBookingLimit: holdLimit != null ? Number(holdLimit) : null
    });

    const blackoutSet = new Set<string>();
    rooms.forEach((r: any) => {
      const list = r.blackout_dates || r.blackoutDates || [];
      (Array.isArray(list) ? list : []).forEach((d: any) => {
        const s = typeof d === 'string' ? d : this.dateToStr(d);
        if (s) blackoutSet.add(s);
      });
    });
    const blackoutArr = Array.from(blackoutSet);
    const blackoutFormArr = this.blackoutDates;
    while (blackoutFormArr.length) {
      blackoutFormArr.removeAt(0);
    }
    blackoutArr.forEach((d) => blackoutFormArr.push(this.fb.control(d)));

    this.buildRoomDetailsControls(rooms);
    this.buildRoomExtraCostsControls();

    const mealKeyList = this.mealKeys().map((m) => m.key);
    const mealKeyForId = (id: any): string | null => {
      const n = Number(id);
      if (!n || isNaN(n)) return null;
      const key = `meal_${n}`;
      return mealKeyList.includes(key) ? key : null;
    };

    rooms.forEach((r: any) => {
      const rid = Number(r.room_id);
      const roomExtra = r.extra_costs || r.extraCosts || null;
      if (roomExtra) {
        const applyExtra = (
          day: 'weekday' | 'weekend',
          kind: 'adult' | 'child' | 'child_with_bed'
        ) => {
          const list = roomExtra[day]?.[kind] || [];
          (Array.isArray(list) ? list : []).forEach((entry: any) => {
            const key =
              typeof entry.meal_type === 'number'
                ? mealKeyForId(entry.meal_type)
                : null;
            if (!key) return;
            const ctrl = this.roomExtraCostCtrl(rid, day, kind, key);
            ctrl.setValue(String(entry.amount ?? ''));
          });
        };
        applyExtra('weekday', 'adult');
        applyExtra('weekday', 'child');
        applyExtra('weekday', 'child_with_bed');
        applyExtra('weekend', 'adult');
        applyExtra('weekend', 'child');
        applyExtra('weekend', 'child_with_bed');
      }
    });
  }

  save(): void {
    if (!this.inventoryId) return;
    const blackoutDates = (this.blackoutDates?.value as string[]) || [];
    const extraCosts = this.getExtraCostsPayload();
    const isRefundable = this.form.get('isRefundable')?.value === 'refundable';
    const pricePerNight = 0;
    const rulesArr = isRefundable
      ? this.fareRules.controls
          .map((c: any) => {
            const days = Number(c.get('days')?.value ?? 0);
            const amount = Number(c.get('amount')?.value ?? 0);
            const pct =
              pricePerNight > 0
                ? Math.min(100, Math.max(0, (amount / pricePerNight) * 100))
                : null;
            return {
              days_before_checkin: days,
              percentage: pct,
              amount
            };
          })
          .filter(
            (r: any) =>
              r.days_before_checkin > 0 &&
              (r.percentage !== null ||
                (typeof r.amount === 'number' && r.amount >= 0))
          )
      : [];

    const roomDetailsArr: any[] = [];
    this.roomDetails.controls.forEach((ctrl) => {
      const grp = ctrl as FormGroup;
      const rid = Number(grp.get('roomId')?.value ?? 0) || 0;
      if (!rid) return;
      const roomExtraCosts = this.getRoomExtraCostsPayload(rid);
      if (roomExtraCosts) {
        roomDetailsArr.push({
          room_id: rid,
          extra_costs: roomExtraCosts
        });
      }
    });

    const payload = {
      inventory: {
        check_in_time: this.form.get('checkinTime')?.value,
        check_out_time: this.form.get('checkoutTime')?.value,
        extra_costs: extraCosts,
        is_refundable: isRefundable,
        refund_rules: rulesArr,
        allow_hold_booking: !!this.form.get('allowHoldBooking')?.value,
        hold_type:
          this.form.get('holdBookingType')?.value === 'percentage'
            ? 'P'
            : this.form.get('holdBookingType')?.value === 'flat'
              ? 'F'
              : null,
        hold_value:
          this.form.get('holdBookingAmount')?.value != null
            ? Number(this.form.get('holdBookingAmount')?.value)
            : null,
        hold_booking_days:
          this.form.get('holdBookingCutOffDays')?.value != null
            ? Number(this.form.get('holdBookingCutOffDays')?.value)
            : null,
        hold_booking_limit:
          this.form.get('holdBookingLimit')?.value != null
            ? Number(this.form.get('holdBookingLimit')?.value)
            : null,
        blackout_dates: blackoutDates
      },
      room_detail: roomDetailsArr
    };

    this.saving = true;
    this.hotelService.getInventoryDetails(this.inventoryId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Inventory updated', 'Close', {
          duration: 2000
        });
        this.router.navigate(['/sale/hotel-inventory-management']);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to update inventory', 'Close', {
          duration: 2500
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sale/hotel-inventory-management']);
  }

  onNumericKeydown(e: KeyboardEvent): void {
    const allowed = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ];
    if (allowed.includes(e.key)) return;
    if (
      (e.ctrlKey || e.metaKey) &&
      ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())
    )
      return;
    if (/^[0-9]$/.test(e.key)) return;
    e.preventDefault();
  }

  onNumericInput(ev: Event, ctrl: FormControl): void {
    const el = ev.target as HTMLInputElement;
    const clean = String(el.value || '').replace(/[^0-9]/g, '');
    if (el.value !== clean) el.value = clean;
    ctrl.setValue(clean);
  }
}
