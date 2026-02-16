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
import { MatDateRangePicker } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import {
  Observable,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map
} from 'rxjs';
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
  selector: 'vex-add-hotel-inventory',
  templateUrl: './add-hotel-inventory.component.html',
  styleUrls: ['./add-hotel-inventory.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatRadioModule,
    MatAutocompleteModule,
    RouterModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class AddHotelInventoryComponent implements OnInit {
  form!: FormGroup;
  hotels: any[] = [];
  roomTypes: any[] = [];
  mealOptions: any[] = [];
  saving = false;
  roomsSections: { section: string; items: any[] }[] = [];
  roomsFlat: any[] = [];
  selectedRoomIds: number[] = [];
  occupancyLabels = ['Single', 'Double', 'Triple'];
  occupancyKeys = ['single', 'double', 'triple'];
  hotelDetails: any | null = null;
  minDate: Date = new Date();
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  selectedCountryId: number | null = null;
  selectedStateId: number | null = null;
  selectedCityId: number | null = null;
  selectedCityName: string = '';
  bindDefaultData: boolean = true;
  defaultCountryName = 'India';
  defaultStateName = 'Rajasthan';
  defaultCityNameTarget = 'Udaipur';
  defaultHotelName = 'Alpine Hotel Restaurant';
  mode: 'confirm' | 'normal' = 'confirm';
  inventoryId: number | null = null;

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
      hotelSearch: [{ value: '', disabled: true }],
      hotelId: [null, Validators.required],
      roomTypeId: [null, Validators.required],
      date: [null, Validators.required],
      availableRooms: [null, [Validators.required, Validators.min(0)]],
      pricePerNight: [null, [Validators.required, Validators.min(0)]],
      status: ['available', Validators.required],
      checkinTime: ['', Validators.required],
      checkoutTime: ['', Validators.required],
      adultAgeLimit: [12, Validators.required],
      isRefundable: ['non-refundable', Validators.required],
      fareRules: this.fb.array([]),
      allowHoldBooking: [false],
      holdBookingType: ['percentage'],
      holdBookingAmount: [null],
      holdBookingCutOffDays: [null],
      holdBookingLimit: [null],
      markupType: [null],
      markupValue: [null],
      extraCosts: this.fb.group({
        childAgeFrom: [null],
        childAgeTo: [null],
        childWithBedAgeFrom: [null],
        childWithBedAgeTo: [null]
      }),
      blackoutDates: this.fb.array([]),
      blackoutDateInput: [null],
      normalRangeStart: [null],
      normalRangeEnd: [null],
      normalDateRanges: this.fb.array([]),
      normalWeekendDays: this.fb.array([]),
      roomDetails: this.fb.array([])
    });
    this.loadCountries();
    this.bindHotelAutocomplete();
    this.loadRoomTypes();
    this.buildExtraCostsControls();
    this.loadMealOptions();
    this.minDate.setHours(0, 0, 0, 0);

    const invIdStr = this.route.snapshot.queryParamMap.get('inventory_id');
    const invId = invIdStr ? Number(invIdStr) : 0;
    if (invId) {
      this.inventoryId = invId;
    }
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    if (typeParam === 'normal' || typeParam === 'confirm') {
      this.mode = typeParam as any;
    }
    if (invId) {
      this.hotelService.getHotelInventoryById(invId).subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          this.prefillFromInventory(data);
        },
        error: () => {}
      });
    }
    if (this.bindDefaultData) {
      this.initDefaultBinding();
    }

    this.form
      .get('cityId')
      ?.valueChanges.pipe(distinctUntilChanged(), debounceTime(200))
      .subscribe(() => {
        this.loadHotelsForDropdown();
      });

    this.form
      .get('hotelId')
      ?.valueChanges.pipe(distinctUntilChanged(), debounceTime(100))
      .subscribe((id: number) => {
        if (!id) return;
        const hotel = this.hotels.find((h: any) => Number(h.id) === Number(id));
        if (hotel) {
          this.form.patchValue({ hotelSearch: hotel.name });
        }
        this.hotelService.getHotelById(id).subscribe({
          next: (res: any) => {
            const payload = res?.data ?? res;
            const h = payload?.hotel ?? payload;
            this.hotelDetails = h || null;
            const ci = h?.policy_check_in || h?.check_in_time || '';
            const co = h?.policy_check_out || h?.check_out_time || '';
            this.form.patchValue({
              checkinTime: ci,
              checkoutTime: co
            });
          },
          error: () => {}
        });
        this.loadHotelRooms(id);
      });

    const amountCtrl = this.form.get('holdBookingAmount') as FormControl;
    const typeCtrl = this.form.get('holdBookingType') as FormControl;
    const cutOffCtrl = this.form.get('holdBookingCutOffDays') as FormControl;
    const limitCtrl = this.form.get('holdBookingLimit') as FormControl;
    const priceCtrl = this.form.get('pricePerNight') as FormControl;
    const allowCtrl = this.form.get('allowHoldBooking') as FormControl;
    const markupTypeCtrl = this.form.get('markupType') as FormControl;
    const markupValueCtrl = this.form.get('markupValue') as FormControl;
    const setAmountValidators = () => {
      const v: any[] = [Validators.required, Validators.min(0)];
      if (typeCtrl?.value === 'percentage') v.push(Validators.max(100));
      amountCtrl.setValidators([...v, this.holdAmountPriceValidator()]);
      amountCtrl.updateValueAndValidity({ emitEvent: false });
    };
    amountCtrl.setValidators([
      Validators.required,
      Validators.min(0),
      this.holdAmountPriceValidator()
    ]);
    cutOffCtrl.setValidators([
      Validators.required,
      Validators.min(1),
      this.holdCutOffDaysValidator()
    ]);
    limitCtrl.setValidators([
      Validators.required,
      Validators.min(1),
      this.holdLimitValidator()
    ]);
    setAmountValidators();
    typeCtrl?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => setAmountValidators());
    priceCtrl?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => amountCtrl.updateValueAndValidity({ emitEvent: false }));
    cutOffCtrl?.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      cutOffCtrl.updateValueAndValidity({ emitEvent: false });
      limitCtrl.updateValueAndValidity({ emitEvent: false });
    });
    const setMarkupValidators = () => {
      const v: any[] = [Validators.min(0)];
      if (markupTypeCtrl?.value === 'percentage') v.push(Validators.max(100));
      markupValueCtrl.setValidators(v);
      markupValueCtrl.updateValueAndValidity({ emitEvent: false });
    };
    setMarkupValidators();
    markupTypeCtrl?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => setMarkupValidators());
    allowCtrl?.valueChanges.subscribe((enabled) => {
      const apply = (c: FormControl, validators: any[]) => {
        c.setValidators(enabled ? validators : []);
        c.updateValueAndValidity({ emitEvent: false });
      };
      apply(amountCtrl, [
        Validators.required,
        Validators.min(0),
        this.holdAmountPriceValidator()
      ]);
      apply(cutOffCtrl, [
        Validators.required,
        Validators.min(1),
        this.holdCutOffDaysValidator()
      ]);
      apply(limitCtrl, [
        Validators.required,
        Validators.min(1),
        this.holdLimitValidator()
      ]);
      if (!enabled) {
        amountCtrl.setValue(null);
        cutOffCtrl.setValue(null);
        limitCtrl.setValue(null);
      } else {
        setAmountValidators();
      }
    });
  }

  prefillFromInventory(data: any): void {
    const inv = data?.inventory;
    const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
    if (!inv) return;
    this.form.patchValue({
      hotelId: inv.hotel_id,
      hotelSearch: inv.hotel_name || '',
      checkinTime: inv.check_in_time || '',
      checkoutTime: inv.check_out_time || '',
      extraBedPrice: inv.extra_bed_price ?? null,
      markupType:
        inv.markup_type === 'P'
          ? 'percentage'
          : inv.markup_type === 'F'
            ? 'flat'
            : null,
      markupValue: inv.markup_value != null ? Number(inv.markup_value) : null
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
    this.hotelService.getHotelById(inv.hotel_id).subscribe({
      next: (res: any) => {
        const payload = res?.data ?? res;
        const h = payload?.hotel ?? payload;
        this.hotelDetails = h || null;
        this.selectedCountryId =
          Number(h?.country_id ?? h?.location?.country_id ?? 0) || null;
        this.selectedStateId =
          Number(h?.state_id ?? h?.location?.state_id ?? 0) || null;
        this.selectedCityId =
          Number(h?.city_id ?? h?.location?.city_id ?? 0) || null;
        if (this.selectedCountryId) {
          this.form.patchValue({ countryId: this.selectedCountryId });
          this.userService
            .getStatesByCountry(this.selectedCountryId)
            .subscribe({
              next: (statesRes: any) => {
                this.states = Array.isArray(statesRes)
                  ? statesRes
                  : statesRes?.data
                    ? statesRes.data
                    : [];
                if (this.selectedStateId) {
                  this.form.get('stateId')?.enable();
                  this.form.patchValue({ stateId: this.selectedStateId });
                  this.userService
                    .getCitiesByState(this.selectedStateId)
                    .subscribe({
                      next: (citiesRes: any) => {
                        this.cities = Array.isArray(citiesRes)
                          ? citiesRes
                          : citiesRes?.data
                            ? citiesRes.data
                            : [];
                        if (this.selectedCityId) {
                          this.form.get('cityId')?.enable();
                          this.form.patchValue({ cityId: this.selectedCityId });
                          const cityObj = this.cities.find(
                            (c: any) =>
                              Number(c.id) === Number(this.selectedCityId)
                          );
                          this.selectedCityName = cityObj
                            ? cityObj.name || ''
                            : '';
                          this.form.get('hotelSearch')?.enable();
                          this.loadHotelsForDropdown();
                        }
                      },
                      error: () => {}
                    });
                }
                const childFromCtrl = this.form.get('extraCosts.childAgeFrom');
                const childToCtrl = this.form.get('extraCosts.childAgeTo');
                if (childFromCtrl && childToCtrl) {
                  childFromCtrl.valueChanges
                    .pipe(distinctUntilChanged())
                    .subscribe((fromVal: any) => {
                      const fromNum = Number(fromVal ?? 0);
                      const toVal = Number(childToCtrl.value ?? 0);
                      if (childToCtrl.value != null && toVal <= fromNum) {
                        childToCtrl.setValue(null);
                      }
                    });
                }
                const childBedFromCtrl = this.form.get(
                  'extraCosts.childWithBedAgeFrom'
                );
                const childBedToCtrl = this.form.get(
                  'extraCosts.childWithBedAgeTo'
                );
                if (childBedFromCtrl && childBedToCtrl) {
                  childBedFromCtrl.valueChanges
                    .pipe(distinctUntilChanged())
                    .subscribe((fromVal: any) => {
                      const fromNum = Number(fromVal ?? 0);
                      const toVal = Number(childBedToCtrl.value ?? 0);
                      if (childBedToCtrl.value != null && toVal <= fromNum) {
                        childBedToCtrl.setValue(null);
                      }
                    });
                }
              },
              error: () => {}
            });
        }
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
        this.loadHotelRooms(inv.hotel_id);
        setTimeout(() => {
          const selectedIds = rooms
            .map((r: any) => Number(r.room_id))
            .filter((n: any) => !!n);
          this.selectedRoomIds = Array.from(new Set(selectedIds));
          const mealKeyList = this.mealKeys().map((m) => m.key);
          const mealKeyForId = (id: any): string | null => {
            const n = Number(id);
            if (!n || isNaN(n)) return null;
            const key = `meal_${n}`;
            return mealKeyList.includes(key) ? key : null;
          };
          for (const r of rooms) {
            const rid = Number(r.room_id);
            const grp = this.getRoomGroup(rid);
            const det = r.detail || {};
            grp.patchValue({
              adults: det.adults ?? 0,
              children: det.child ?? 0,
              infants: det.infants ?? 0,
              maxPersons: det.max_person ?? grp.get('maxPersons')?.value ?? 1
            });
            const wdArr = this.getWeekendDays(rid);
            while (wdArr.length) wdArr.removeAt(0);
            (det.weekend_days || []).forEach((code: string) =>
              wdArr.push(this.fb.control(code))
            );
            const ranges = Array.isArray(r.ranges) ? r.ranges : [];
            const dates = Array.isArray(r.dates) ? r.dates : [];
            const rangesArr = this.getDateRanges(rid);
            while (rangesArr.length) rangesArr.removeAt(0);
            for (const rg of ranges) {
              const from = rg.start_date;
              const to = rg.end_date;
              const pricesGrp = this.createInitialPricesFor(rid);
              const init = this.fb.group({
                from: [from],
                to: [to],
                prices: pricesGrp,
                roomsCount: [
                  rg.rooms_count ??
                    this.deriveRoomsCountForRange(dates, from, to) ??
                    0
                ]
              });
              rangesArr.push(init);
              const priceRows = Array.isArray(r.prices) ? r.prices : [];
              for (const pr of priceRows) {
                if (pr.start_date !== from || pr.end_date !== to) continue;
                const kind = pr.type === 'weekend_days' ? 'weekend' : 'weekday';
                const occ = `p${Number(pr.person) || 1}`;
                let mealKey =
                  typeof pr.meal_type === 'number'
                    ? mealKeyForId(pr.meal_type)
                    : null;
                if (!mealKey) {
                  const mk = this.mealKeys().find(
                    (m) =>
                      String(m.label).toLowerCase() ===
                      String(pr.meal_type).toLowerCase()
                  );
                  mealKey = mk?.key || null;
                }
                if (!mealKey) continue;
                const ctrl = this.getPriceControl(
                  init,
                  kind as any,
                  occ,
                  mealKey
                );
                ctrl?.setValue(String(pr.amount));
              }
            }
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
          }
        }, 300);
      },
      error: () => {}
    });
  }

  deriveRoomsCountForRange(
    dates: any[],
    start: string,
    end: string
  ): number | null {
    const s = new Date(start);
    const e = new Date(end);
    for (const d of dates) {
      const dt = new Date(d.date);
      if (dt >= s && dt <= e) return Number(d.no_of_room) || 0;
    }
    return null;
  }

  bindHotelAutocomplete(): void {
    this.form
      .get('hotelSearch')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string) => {
          const q = String(query || '').trim();
          const cityId =
            Number(
              this.form.get('cityId')?.value || this.selectedCityId || 0
            ) || 0;
          if (!q || !cityId) return of([]);
          return this.hotelService
            .searchHotelsAutocomplete(
              q,
              10,
              cityId,
              this.selectedStateId ?? undefined,
              this.selectedCountryId ?? undefined
            )
            .pipe(
              map((res: any) =>
                Array.isArray(res?.data)
                  ? res.data
                  : Array.isArray(res)
                    ? res
                    : []
              )
            );
        })
      )
      .subscribe((rows) => {
        this.hotels = rows;
      });
  }

  loadHotelsForDropdown(): void {
    const cityId =
      Number(this.form.get('cityId')?.value || this.selectedCityId || 0) || 0;
    if (!cityId) {
      this.hotels = [];
      return;
    }
    this.hotelService
      .searchHotelsAutocomplete(
        '',
        100,
        cityId,
        this.selectedStateId ?? undefined,
        this.selectedCountryId ?? undefined
      )
      .pipe(
        map((res: any) =>
          Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        )
      )
      .subscribe((rows) => {
        this.hotels = rows;
      });
  }

  filterHotelsByLocation(rows: any[]): any[] {
    const cId =
      Number(this.form.get('cityId')?.value || this.selectedCityId || 0) || 0;
    const cityObj = this.cities.find((c: any) => Number(c.id) === cId);
    const cName = (cityObj?.name || this.selectedCityName || '')
      .toString()
      .toLowerCase();
    if (!cId && !cName) return [];
    return (rows || []).filter((h: any) => {
      const ids = [
        Number(h?.city_id || 0),
        Number(h?.cityId || 0),
        Number(h?.city?.id || 0),
        Number(h?.location?.city_id || 0)
      ].filter((n) => !!n);
      const names = [
        (h?.city || '').toString().toLowerCase(),
        (h?.city_name || '').toString().toLowerCase(),
        (h?.location?.city || '').toString().toLowerCase()
      ].filter((s) => !!s);
      const matchId = cId ? ids.some((id) => id === cId) : false;
      const matchName = cName ? names.some((nm) => nm === cName) : false;
      return matchId || matchName;
    });
  }

  loadRoomTypes(): void {
    this.optionService.getActiveOptions('room_type').subscribe({
      next: (res: any) => {
        this.roomTypes = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
  }

  loadMealOptions(): void {
    this.optionService.getActiveOptions('meal_option').subscribe({
      next: (res: any) => {
        this.mealOptions = Array.isArray(res) ? res : res?.data ? res.data : [];
        this.buildExtraCostsControls();
        this.buildRoomExtraCostsControls();
      },
      error: () => {}
    });
  }

  save(): void {
    if (this.mode === 'normal') {
      const errs = this.validateNormalMode();
      if (errs.length) {
        this.snackBar.open(errs[0], 'Close', { duration: 2500 });
        return;
      }
    }
    const payload = this.buildInventoriesPayload();
    if (!payload.inventories || !payload.inventories.length) {
      this.snackBar.open('No prices to save', 'Close', { duration: 2000 });
      return;
    }
    this.saving = true;
    this.hotelService.createHotelInventories(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Inventory saved', 'Close', { duration: 2000 });
        this.router.navigate(['/sale/hotel-inventory-management']);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save inventory', 'Close', {
          duration: 2500
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sale/hotel-inventory-management']);
  }

  onHotelSelected(event: MatAutocompleteSelectedEvent): void {
    const hotel = event.option.value as any;
    if (!hotel) return;
    this.form.patchValue({ hotelId: hotel.id, hotelSearch: hotel.name });
    this.hotelService.getHotelById(hotel.id).subscribe({
      next: (res: any) => {
        const payload = res?.data ?? res;
        const h = payload?.hotel ?? payload;
        this.hotelDetails = h || null;
        const ci = h?.policy_check_in || h?.check_in_time || '';
        const co = h?.policy_check_out || h?.check_out_time || '';
        this.form.patchValue({
          checkinTime: ci,
          checkoutTime: co
        });
      },
      error: () => {}
    });
    this.loadHotelRooms(hotel.id);
  }

  onHotelSelect(id: number): void {
    if (!id) return;
    const hotel = this.hotels.find((h: any) => Number(h.id) === Number(id));
    const name = hotel?.name || '';
    this.form.patchValue({ hotelId: id, hotelSearch: name });
    this.hotelService.getHotelById(id).subscribe({
      next: (res: any) => {
        const payload = res?.data ?? res;
        const h = payload?.hotel ?? payload;
        this.hotelDetails = h || null;
        const ci = h?.policy_check_in || h?.check_in_time || '';
        const co = h?.policy_check_out || h?.check_out_time || '';
        this.form.patchValue({
          checkinTime: ci,
          checkoutTime: co
        });
      },
      error: () => {}
    });
    this.loadHotelRooms(id);
  }

  loadHotelRooms(id: number): void {
    this.hotelService.getHotelRooms(id).subscribe({
      next: (res: any) => {
        const sections = res?.data?.sections;
        if (Array.isArray(sections) && sections.length) {
          this.roomsSections = sections;
          const roomsFlat = sections.flatMap((s: any) => s.items || []);
          this.roomsFlat = roomsFlat;
          this.selectedRoomIds = roomsFlat?.length ? [roomsFlat[0]?.id] : [];
          this.buildRoomDetailsControls(roomsFlat);
        } else {
          const rooms = res?.data?.rooms || [];
          this.buildRoomsSections(rooms);
          this.roomsFlat = rooms;
          this.selectedRoomIds = rooms?.length ? [rooms[0]?.id] : [];
          this.buildRoomDetailsControls(rooms);
        }
        this.buildRoomExtraCostsControls();
      },
      error: () => {}
    });
  }

  buildRoomsSections(rooms: any[]): void {
    const mapSec = new Map<string, any[]>();
    rooms.forEach((r) => {
      const section = r?.room_type?.name || 'Other';
      if (!mapSec.has(section)) mapSec.set(section, []);
      mapSec.get(section)!.push(r);
    });
    this.roomsSections = Array.from(mapSec.entries()).map(
      ([section, items]) => ({ section, items })
    );
  }

  get roomDetails(): FormArray {
    return this.form.get('roomDetails') as FormArray;
  }

  buildRoomDetailsControls(rooms: any[]): void {
    const arr = this.roomDetails;
    while (arr.length) arr.removeAt(0);
    rooms.forEach((r) => {
      arr.push(
        this.fb.group({
          roomId: [r?.id],
          adults: [r?.max_adult ?? 0, [Validators.min(0)]],
          children: [r?.max_child ?? 0, [Validators.min(0)]],
          infants: [r?.max_infant ?? 0, [Validators.min(0)]],
          maxPersons: [
            r?.max_occupancy ??
              (r?.max_adult ?? 0) + (r?.max_child ?? 0) + (r?.max_infant ?? 0),
            [Validators.min(0)]
          ],
          frontRoomsCount: [
            0,
            this.mode === 'normal'
              ? [Validators.required, Validators.min(1)]
              : [Validators.min(0)]
          ],
          freeChildNoBedCount: [0, [Validators.min(0)]],
          freeChildNoBedAge: [null],
          rangeStart: [null],
          rangeEnd: [null],
          dateRanges: this.fb.array([]),
          weekendDays: this.fb.array([]),
          extraCosts: this.fb.group({}),
          selectedMeals: this.fb.array([]),
          selectedOccupancies: this.fb.array([])
        })
      );
    });
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
        adults: [0],
        children: [0],
        infants: [0],
        maxPersons: [0],
        frontRoomsCount: [0],
        freeChildNoBedCount: [0],
        freeChildNoBedAge: [null],
        rangeStart: [null],
        rangeEnd: [null],
        dateRanges: this.fb.array([]),
        weekendDays: this.fb.array([]),
        extraCosts: this.fb.group({}),
        selectedMeals: this.fb.array([]),
        selectedOccupancies: this.fb.array([])
      })
    );
  }

  getDateRanges(roomId: number): FormArray {
    const grp = this.getRoomGroup(roomId);
    return (grp.get('dateRanges') as FormArray) || this.fb.array([]);
  }
  get normalDateRanges(): FormArray {
    return this.form.get('normalDateRanges') as FormArray;
  }
  get normalWeekendDays(): FormArray {
    return this.form.get('normalWeekendDays') as FormArray;
  }
  get fareRules(): FormArray {
    return this.form.get('fareRules') as FormArray;
  }
  holdAmountPriceValidator() {
    return (control: AbstractControl) => {
      const type = this.form?.get('holdBookingType')?.value;
      const price = Number(this.form?.get('pricePerNight')?.value || 0);
      const val = Number(control.value || 0);
      if (
        type === 'flat' &&
        !isNaN(val) &&
        !isNaN(price) &&
        price > 0 &&
        val > price
      ) {
        return { exceedsPrice: true };
      }
      return null;
    };
  }
  holdCutOffDaysValidator() {
    return (control: AbstractControl) => {
      const val = Number(control.value || 0);
      if (!isNaN(val) && val > 30) return { maxDaysExceeded: true };
      return null;
    };
  }
  holdLimitValidator() {
    return (control: AbstractControl) => {
      const hours = Number(control.value || 0);
      const days = Number(this.form?.get('holdBookingCutOffDays')?.value || 0);
      if (!isNaN(hours) && !isNaN(days) && days > 0 && hours > days * 24) {
        return { limitExceedsCutOff: true };
      }
      return null;
    };
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

  onRoomSelect(value: any): void {
    this.selectedRoomIds = Array.isArray(value)
      ? value
      : value != null
        ? [value]
        : [];
    // Ensure normal mode global ranges and weekend days mirror into newly selected rooms
    if (this.mode === 'normal') {
      const days = (this.normalWeekendDays?.value || []) as string[];
      for (const rid of this.selectedRoomIds) {
        // Weekend days
        const rArr = this.getWeekendDays(rid);
        while (rArr.length) rArr.removeAt(0);
        days.forEach((d) => rArr.push(this.fb.control(d)));
        // Date ranges
        const roomRanges = this.getDateRanges(rid);
        const defaultRooms =
          Number(this.getRoomGroup(rid).get('frontRoomsCount')?.value ?? 0) ||
          0;
        for (const rg of this.normalDateRanges.controls) {
          const from = (rg as FormGroup).get('from')?.value;
          const to = (rg as FormGroup).get('to')?.value;
          const exists = roomRanges.controls.some(
            (c) => c.value?.from === from && c.value?.to === to
          );
          if (!exists) {
            roomRanges.push(
              this.fb.group({
                from,
                to,
                prices: this.createInitialPricesFor(rid),
                roomsCount: [defaultRooms, [Validators.min(0)]]
              })
            );
          }
        }
      }
    }
  }

  isRoomSelected(roomId: any): boolean {
    if (roomId == null) return false;
    const target = String(roomId);
    return this.selectedRoomIds.some((id) => String(id) === target);
  }

  roomById(roomId: number): any | null {
    const target = String(roomId);
    return this.roomsFlat.find((r: any) => String(r?.id) === target) || null;
  }

  sectionForRoom(roomId: number): string {
    const target = String(roomId);
    for (const sec of this.roomsSections) {
      const found = (sec.items || []).find(
        (r: any) => String(r?.id) === target
      );
      if (found) return sec.section;
    }
    return 'Other';
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

  parseLocalDate(v: any): Date {
    if (!v) return new Date(NaN);
    if (v instanceof Date) return v;
    const s = String(v);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d);
    }
    return new Date(s);
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

  normalizeName(s: any): string {
    return String(s ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  initDefaultBinding(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
        const c = (this.countries || []).find(
          (x: any) =>
            this.normalizeName(x?.name) ===
            this.normalizeName(this.defaultCountryName)
        );
        const countryId = Number(c?.id || 0) || null;
        if (!countryId) return;
        this.onCountryChange(countryId);
        this.userService.getStatesByCountry(countryId).subscribe({
          next: (stRes: any) => {
            this.states = Array.isArray(stRes)
              ? stRes
              : stRes?.data
                ? stRes.data
                : [];
            const s = (this.states || []).find(
              (x: any) =>
                this.normalizeName(x?.name) ===
                this.normalizeName(this.defaultStateName)
            );
            const stateId = Number(s?.id || 0) || null;
            if (!stateId) return;
            this.onStateChange(stateId);
            this.userService.getCitiesByState(stateId).subscribe({
              next: (ciRes: any) => {
                this.cities = Array.isArray(ciRes)
                  ? ciRes
                  : ciRes?.data
                    ? ciRes.data
                    : [];
                const ci = (this.cities || []).find(
                  (x: any) =>
                    this.normalizeName(x?.name) ===
                    this.normalizeName(this.defaultCityNameTarget)
                );
                const cityId = Number(ci?.id || 0) || null;
                if (!cityId) return;
                this.onCityChange(cityId);
                this.hotelService
                  .searchHotelsAutocomplete(
                    this.defaultHotelName,
                    10,
                    cityId,
                    stateId ?? undefined,
                    countryId ?? undefined
                  )
                  .subscribe({
                    next: (hRes: any) => {
                      const rows = Array.isArray(hRes?.data)
                        ? hRes.data
                        : Array.isArray(hRes)
                          ? hRes
                          : [];
                      this.hotels = rows;
                      const h = rows.find(
                        (x: any) =>
                          this.normalizeName(x?.name) ===
                            this.normalizeName(this.defaultHotelName) ||
                          this.normalizeName(x?.hotel_name) ===
                            this.normalizeName(this.defaultHotelName)
                      );
                      if (h?.id) {
                        this.form.patchValue({
                          hotelId: h.id,
                          hotelSearch: h.name || h.hotel_name || ''
                        });
                        this.onHotelSelected({ option: { value: h } } as any);
                      }
                    },
                    error: () => {}
                  });
              },
              error: () => {}
            });
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }
  roomAvailableRooms(roomId: number): number {
    const r = this.roomById(roomId);
    return Number(r?.available_rooms ?? 0) || 0;
  }
  computedRoomsCountForRoom(roomId: number): number {
    return this.roomAvailableRooms(roomId);
  }
  computedCapacityForRoom(roomId: number): number {
    const rooms = this.roomAvailableRooms(roomId);
    const persons = this.occupancyCount(roomId);
    return rooms * persons;
  }

  onAddDateRange(roomId: number, picker?: MatDateRangePicker<Date>): void {
    const grp = this.getRoomGroup(roomId);
    const start = grp.get('rangeStart')?.value;
    const end = grp.get('rangeEnd')?.value;
    if (!start || !end) {
      if (picker) picker.open();
      return;
    }
    const startDate =
      start instanceof Date ? start : this.parseLocalDate(start);
    const endDate = end instanceof Date ? end : this.parseLocalDate(end);
    if (startDate > endDate) {
      this.snackBar.open('Start date must be before end date', 'Close', {
        duration: 2000
      });
      return;
    }
    const s = this.dateToStr(start);
    const e = this.dateToStr(end);
    const arr = this.getDateRanges(roomId);
    const dup = arr.controls.some(
      (c) => c.value?.from === s && c.value?.to === e
    );
    if (dup) {
      this.snackBar.open('Duplicate date range', 'Close', { duration: 2000 });
      return;
    }
    const overlaps = arr.controls.some((c) => {
      const cf = this.parseLocalDate(c.value?.from);
      const ct = this.parseLocalDate(c.value?.to);
      return startDate <= ct && endDate >= cf;
    });
    if (overlaps) {
      this.snackBar.open('Date range overlaps existing range', 'Close', {
        duration: 2000
      });
      return;
    }
    const defaultRooms = Number(grp.get('frontRoomsCount')?.value ?? 0) || 0;
    arr.push(
      this.fb.group({
        from: [s],
        to: [e],
        prices: this.createInitialPricesFor(roomId),
        roomsCount: [
          this.mode === 'normal' ? defaultRooms : 0,
          [Validators.min(0)]
        ]
      })
    );
    grp.patchValue({ rangeStart: null, rangeEnd: null });
    if (picker) picker.close();
  }

  onRangeSelected(roomId: number, picker?: MatDateRangePicker<Date>): void {
    const grp = this.getRoomGroup(roomId);
    const start = grp.get('rangeStart')?.value;
    const end = grp.get('rangeEnd')?.value;
    if (start && end) {
      this.onAddDateRange(roomId, picker);
    }
  }

  onAddNormalDateRange(picker?: MatDateRangePicker<Date>): void {
    const start = this.form.get('normalRangeStart')?.value;
    const end = this.form.get('normalRangeEnd')?.value;
    if (!start || !end) {
      if (picker) picker.open();
      return;
    }
    const startDate =
      start instanceof Date ? start : this.parseLocalDate(start);
    const endDate = end instanceof Date ? end : this.parseLocalDate(end);
    if (startDate > endDate) {
      this.snackBar.open('Start date must be before end date', 'Close', {
        duration: 2000
      });
      return;
    }
    const s = this.dateToStr(start);
    const e = this.dateToStr(end);
    const arr = this.normalDateRanges;
    const dup = arr.controls.some(
      (c) => c.value?.from === s && c.value?.to === e
    );
    if (dup) {
      this.snackBar.open('Duplicate date range', 'Close', { duration: 2000 });
      return;
    }
    const overlaps = arr.controls.some((c) => {
      const cf = this.parseLocalDate(c.value?.from);
      const ct = this.parseLocalDate(c.value?.to);
      return startDate <= ct && endDate >= cf;
    });
    if (overlaps) {
      this.snackBar.open('Date range overlaps existing range', 'Close', {
        duration: 2000
      });
      return;
    }
    arr.push(
      this.fb.group({
        from: [s],
        to: [e]
      })
    );
    // Mirror into each selected room's ranges for pricing controls
    for (const rid of this.selectedRoomIds) {
      const grp = this.getRoomGroup(rid);
      const roomRanges = this.getDateRanges(rid);
      const exists = roomRanges.controls.some(
        (c) => c.value?.from === s && c.value?.to === e
      );
      if (!exists) {
        const defaultRooms =
          Number(grp.get('frontRoomsCount')?.value ?? 0) || 0;
        roomRanges.push(
          this.fb.group({
            from: [s],
            to: [e],
            prices: this.createInitialPricesFor(rid),
            roomsCount: [
              this.mode === 'normal' ? defaultRooms : 0,
              [Validators.min(0)]
            ]
          })
        );
      }
    }
    this.form.patchValue({ normalRangeStart: null, normalRangeEnd: null });
    if (picker) picker.close();
  }

  onNormalRangeSelected(picker?: MatDateRangePicker<Date>): void {
    const start = this.form.get('normalRangeStart')?.value;
    const end = this.form.get('normalRangeEnd')?.value;
    if (start && end) {
      this.onAddNormalDateRange(picker);
    }
  }

  removeNormalDateRange(index: number): void {
    const arr = this.normalDateRanges;
    if (index < 0 || index >= arr.length) return;
    const val = arr.at(index)?.value;
    const from = val?.from;
    const to = val?.to;
    arr.removeAt(index);
    // Remove mirrored ranges from rooms
    for (const rid of this.selectedRoomIds) {
      const roomRanges = this.getDateRanges(rid);
      const idx = roomRanges.controls.findIndex(
        (c) => c.value?.from === from && c.value?.to === to
      );
      if (idx > -1) roomRanges.removeAt(idx);
    }
  }

  toggleNormalWeekendDay(day: string, checked: boolean): void {
    const arr = this.normalWeekendDays;
    const idx = arr.value.indexOf(day);
    if (checked && idx === -1) arr.push(this.fb.control(day));
    if (!checked && idx > -1) arr.removeAt(idx);
    // Mirror to rooms
    const days = (arr.value || []) as string[];
    for (const rid of this.selectedRoomIds) {
      const rArr = this.getWeekendDays(rid);
      // Clear and set
      while (rArr.length) rArr.removeAt(0);
      days.forEach((d) => rArr.push(this.fb.control(d)));
    }
  }

  dateFilterForRoom(roomId: number): (date: Date | null) => boolean {
    return (date: Date | null) => {
      if (!date) return false;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = d < today;
      const ranges = this.getDateRanges(roomId).controls;
      // Disallow any date that falls inside an already-added range
      const blocked = ranges.some((c) => {
        const from = c.value?.from ? this.parseLocalDate(c.value.from) : null;
        const to = c.value?.to ? this.parseLocalDate(c.value.to) : null;
        if (!from || !to) return false;
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        return d >= from && d <= to;
      });
      return !blocked && !isPast;
    };
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

  createMealPricesGroup(): FormGroup {
    const g = this.fb.group({});
    this.mealKeys().forEach((mk) =>
      g.addControl(
        mk.key,
        this.fb.control(null, [Validators.pattern(/^\d+$/), Validators.min(0)])
      )
    );
    return g;
  }
  ageOptions(): number[] {
    return Array.from({ length: 17 }, (_, i) => i + 1);
  }

  childAgeOptions(): number[] {
    const ctrl = this.form?.get('adultAgeLimit');
    const raw = ctrl ? Number(ctrl.value ?? 17) : 17;
    const max = !isNaN(raw) && raw >= 1 && raw <= 17 ? Math.floor(raw) : 17;
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  buildExtraCostsControls(): void {
    const extra = this.form.get('extraCosts') as FormGroup;
    if (!extra) return;
  }

  extraCostCtrl(
    kind: 'adult' | 'child' | 'child_with_bed',
    mealKey: string
  ): FormControl {
    const extra = this.form.get('extraCosts') as FormGroup;
    return (
      (extra?.get(mealKey) as FormControl) ||
      (this.fb.control(null) as FormControl)
    );
  }

  occupancyCount(roomId: number): number {
    const grp = this.getRoomGroup(roomId);
    const val = Number(grp.get('maxPersons')?.value ?? 1);
    return isNaN(val) || val < 1 ? 1 : Math.floor(val);
  }

  occupancyLabelsFor(roomId: number): string[] {
    const n = this.occupancyCount(roomId);
    return Array.from({ length: n }, (_, i) => String(i + 1));
  }

  occupancyKeysFor(roomId: number): string[] {
    const n = this.occupancyCount(roomId);
    return Array.from({ length: n }, (_, i) => `p${i + 1}`);
  }

  getSelectedOccupancyKeys(roomId: number): string[] {
    const grp = this.getRoomGroup(roomId);
    const arr = grp.get('selectedOccupancies') as FormArray | null;
    const allKeys = this.occupancyKeysFor(roomId);
    const raw = ((arr?.value ?? []) as string[]) || [];
    const set = new Set(raw.filter((k) => allKeys.includes(k)));
    if (!set.size) return allKeys;
    return allKeys.filter((k) => set.has(k));
  }

  isOccupancySelected(roomId: number, occKey: string): boolean {
    const selected = this.getSelectedOccupancyKeys(roomId);
    return selected.includes(occKey);
  }

  toggleOccupancy(roomId: number, occKey: string, checked: boolean): void {
    const grp = this.getRoomGroup(roomId);
    let arr = grp.get('selectedOccupancies') as FormArray | null;
    if (!arr) {
      arr = this.fb.array([]);
      grp.addControl('selectedOccupancies', arr);
    }
    const allKeys = this.occupancyKeysFor(roomId);
    const current = ((arr.value ?? []) as string[]).filter((k) =>
      allKeys.includes(k)
    );
    if (checked) {
      if (!current.length) {
        arr.push(this.fb.control(occKey));
        return;
      }
      if (!current.includes(occKey)) {
        arr.push(this.fb.control(occKey));
      }
      return;
    }
    if (!current.length) {
      allKeys.forEach((k) => {
        if (k !== occKey) {
          arr!.push(this.fb.control(k));
        }
      });
      return;
    }
    const idx = (arr.value as string[]).indexOf(occKey);
    if (idx > -1) {
      arr.removeAt(idx);
    }
  }

  onRoomPersonsChange(roomId: number): void {
    const grp = this.getRoomGroup(roomId);
    const adults = Number(grp.get('adults')?.value ?? 0) || 0;
    const children = Number(grp.get('children')?.value ?? 0) || 0;
    const sum = adults + children;
    if (sum > 0) {
      const currentMax = Number(grp.get('maxPersons')?.value ?? 0) || 0;
      if (sum > currentMax) {
        grp.get('maxPersons')?.setValue(sum);
        this.onMaxPersonsChange(roomId);
        return;
      }
    }
    this.onMaxPersonsChange(roomId);
  }

  onMaxPersonsChange(roomId: number): void {
    const grp = this.getRoomGroup(roomId);
    const adults = Number(grp.get('adults')?.value ?? 0) || 0;
    const children = Number(grp.get('children')?.value ?? 0) || 0;
    const sum = adults + children;
    if (sum > 0) {
      let maxPersons = Number(grp.get('maxPersons')?.value ?? 0) || 0;
      if (maxPersons > sum) {
        maxPersons = sum;
        grp.get('maxPersons')?.setValue(maxPersons);
      }
    }
    const ranges = this.getDateRanges(roomId);
    const n = this.occupancyCount(roomId);
    for (const ctrl of ranges.controls) {
      const grp = ctrl as FormGroup;
      grp.setControl(
        'prices',
        this.fb.group({
          weekday: this.createOccupancyPricesGroup(n),
          weekend: this.createOccupancyPricesGroup(n)
        })
      );
    }
  }

  createOccupancyPricesGroup(count: number): FormGroup {
    const g = this.fb.group({});
    this.occupancyKeysForByCount(count).forEach((occ) =>
      g.addControl(occ, this.createMealPricesGroup())
    );
    return g;
  }

  occupancyKeysForByCount(count: number): string[] {
    const n = isNaN(count) || count < 1 ? 1 : Math.floor(count);
    return Array.from({ length: n }, (_, i) => `p${i + 1}`);
  }

  createInitialPricesFor(roomId: number): FormGroup {
    const n = this.occupancyCount(roomId);
    return this.fb.group({
      weekday: this.createOccupancyPricesGroup(n),
      weekend: this.createOccupancyPricesGroup(n)
    });
  }

  getWeekendDays(roomId: number): FormArray {
    const grp = this.getRoomGroup(roomId);
    return (grp.get('weekendDays') as FormArray) || this.fb.array([]);
  }

  toggleWeekendDay(roomId: number, day: string, checked: boolean): void {
    const arr = this.getWeekendDays(roomId);
    const idx = arr.value.indexOf(day);
    if (checked && idx === -1) arr.push(this.fb.control(day));
    if (!checked && idx > -1) arr.removeAt(idx);
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

  getSelectedMeals(roomId: number): string[] {
    const grp = this.getRoomGroup(roomId);
    const arr = grp.get('selectedMeals') as FormArray | null;
    const val = (arr?.value ?? []) as string[];
    return Array.isArray(val) ? val : [];
  }

  isMealSelected(roomId: number, mealKey: string): boolean {
    const selected = this.getSelectedMeals(roomId);
    if (!selected.length) return true;
    return selected.includes(mealKey);
  }

  getSelectedMealKeys(roomId: number): {
    key: string;
    label: string;
  }[] {
    const selected = this.getSelectedMeals(roomId);
    if (!selected.length) return this.mealKeys();
    const set = new Set(selected);
    return this.mealKeys().filter((m) => set.has(m.key));
  }

  toggleMealType(roomId: number, mealKey: string, checked: boolean): void {
    const grp = this.getRoomGroup(roomId);
    let arr = grp.get('selectedMeals') as FormArray | null;
    if (!arr) {
      arr = this.fb.array([]);
      grp.addControl('selectedMeals', arr);
    }
    const current = (arr.value as string[]) || [];
    const idx = current.indexOf(mealKey);
    if (checked) {
      if (!current.length) {
        this.mealKeys().forEach((m) => {
          if (m.key === mealKey || current.includes(m.key)) {
            if (!current.includes(m.key)) {
              arr!.push(this.fb.control(m.key));
            }
          }
        });
        return;
      }
      if (idx === -1) {
        arr.push(this.fb.control(mealKey));
      }
    } else {
      if (!current.length) {
        this.mealKeys().forEach((m) => {
          if (m.key !== mealKey) {
            arr!.push(this.fb.control(m.key));
          }
        });
        return;
      }
      if (idx > -1) {
        arr.removeAt(idx);
      }
    }
  }

  hasWeekend(roomId: number): boolean {
    return this.getWeekendDays(roomId).length > 0;
  }

  asFormGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  getPriceControl(
    ctrl: AbstractControl,
    kind: 'weekday' | 'weekend',
    occ: string,
    mealKey: string
  ): FormControl {
    return (ctrl as FormGroup).get(
      `prices.${kind}.${occ}.${mealKey}`
    ) as FormControl;
  }
  onNormalPriceChanged(
    roomId: number,
    kind: 'weekday' | 'weekend',
    occ: string,
    mealKey: string,
    ev: Event
  ): void {
    if (this.mode !== 'normal') return;
    const el = ev.target as HTMLInputElement;
    const clean = String(el.value || '').replace(/[^0-9]/g, '');
    el.value = clean;
    const ranges = this.getDateRanges(roomId).controls;
    for (const rg of ranges) {
      const ctrl = this.getPriceControl(rg, kind, occ, mealKey);
      ctrl?.setValue(clean);
    }
  }

  // Extra bed captured at room level via extraBedPrice

  trackByIndex(index: number): number {
    return index;
  }
  trackByOccKey(index: number, key: string): string {
    return key;
  }
  trackByMeal(index: number, mk: { key: string }): string {
    return mk.key;
  }

  isNonEmptyNumeric(val: any): boolean {
    const s = String(val ?? '').trim();
    return !!s && /^\d+$/.test(s);
  }

  private getRoomExtraCostsPayload(roomId: number): any | null {
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

  isBasePricesComplete(roomId: number, kind: 'weekday' | 'weekend'): boolean {
    const ranges = this.getDateRanges(roomId).controls;
    if (!ranges.length) return false;
    const selected = this.getSelectedMeals(roomId);
    if (!selected.length) return false;
    const mealKeys = selected as string[];
    const occKeys = this.getSelectedOccupancyKeys(roomId);
    if (!occKeys.length) return false;
    const baseOccKey = occKeys[0];
    for (const rg of ranges) {
      const grp = rg as FormGroup;
      const baseGrp = grp.get(
        `prices.${kind}.${baseOccKey}`
      ) as FormGroup | null;
      if (!baseGrp) return false;
      for (const mk of mealKeys) {
        const ctrl = baseGrp.get(mk) as FormControl | null;
        if (!ctrl || !this.isNonEmptyNumeric(ctrl.value)) return false;
      }
    }
    return true;
  }

  onApplyBasePrices(
    roomId: number,
    kind: 'weekday' | 'weekend',
    checked: boolean
  ): void {
    if (!checked) return;
    this.applyBasePricesToAll(roomId, kind);
  }

  applyBasePricesToAll(roomId: number, kind: 'weekday' | 'weekend'): void {
    const ranges = this.getDateRanges(roomId).controls;
    const occKeys = this.occupancyKeysFor(roomId);
    const mealKeys = this.mealKeys().map((m) => m.key);
    for (const rg of ranges) {
      const grp = rg as FormGroup;
      const base = grp.get(`prices.${kind}.p1`) as FormGroup | null;
      if (!base) continue;
      const baseVals: any = {};
      mealKeys.forEach((mk) => {
        const v = (base.get(mk) as FormControl | null)?.value;
        baseVals[mk] = this.isNonEmptyNumeric(v) ? v : null;
      });
      occKeys.forEach((occ) => {
        if (occ === 'p1') return;
        const tgt = grp.get(`prices.${kind}.${occ}`) as FormGroup | null;
        if (!tgt) return;
        mealKeys.forEach((mk) => {
          const v = baseVals[mk];
          if (v !== null) (tgt.get(mk) as FormControl | null)?.setValue(v);
        });
      });
    }
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

  buildInventoriesPayload(): any {
    const hotelId = this.form.get('hotelId')?.value;
    const checkIn = this.form.get('checkinTime')?.value;
    const checkOut = this.form.get('checkoutTime')?.value;
    const userId = this.getCurrentUserId();
    const isRefundable = this.form.get('isRefundable')?.value === 'refundable';
    const allDetails: any[] = [];
    const roomDetailsArr: any[] = [];
    const mealList = this.mealKeys();
    const extraCosts = this.getExtraCostsPayload();
    for (const rid of this.selectedRoomIds) {
      const grp = this.getRoomGroup(rid);
      const detailsForRoom: any[] = [];
      const ranges = this.getDateRanges(rid).controls;
      const occKeys = this.getSelectedOccupancyKeys(rid);
      let roomsTotal = 0;
      for (const rg of ranges) {
        const from = rg.value?.from;
        const to = rg.value?.to;
        let roomsCount =
          Number((rg as FormGroup).get('roomsCount')?.value ?? 0) || 0;
        if (this.mode === 'normal') {
          roomsCount = Number(grp.get('frontRoomsCount')?.value ?? 0) || 0;
        }
        roomsTotal += roomsCount;
        for (const occ of occKeys) {
          const person = Number(String(occ).replace(/[^0-9]/g, '')) || 1;
          for (const mk of mealList) {
            const wCtrl = this.getPriceControl(rg, 'weekday', occ, mk.key);
            const wVal = wCtrl?.value;
            if (this.isNonEmptyNumeric(wVal)) {
              detailsForRoom.push({
                room_id: rid,
                start_date: from,
                end_date: to,
                person,
                meal_type: this.mealIdForKey(mk.key, mk.label),
                amount: Number(wVal),
                type: 'week_days',
                rooms_count: roomsCount
              });
            }
            const weCtrl = this.getPriceControl(rg, 'weekend', occ, mk.key);
            const weVal = weCtrl?.value;
            if (this.isNonEmptyNumeric(weVal)) {
              detailsForRoom.push({
                room_id: rid,
                start_date: from,
                end_date: to,
                person,
                meal_type: this.mealIdForKey(mk.key, mk.label),
                amount: Number(weVal),
                type: 'weekend_days',
                rooms_count: roomsCount
              });
            }
          }
        }
      }
      const blackout_dates = (this.blackoutDates?.value as string[]) || [];
      if (detailsForRoom.length) {
        allDetails.push(...detailsForRoom);
        const roomExtraCosts = this.getRoomExtraCostsPayload(rid);
        roomDetailsArr.push({
          room_id: rid,
          adults: Number(grp.get('adults')?.value ?? 0) || 0,
          child: Number(grp.get('children')?.value ?? 0) || 0,
          infants: Number(grp.get('infants')?.value ?? 0) || 0,
          max_person: Number(grp.get('maxPersons')?.value ?? 0) || 0,
          total_rooms: Number(grp.get('frontRoomsCount')?.value ?? 0) || 0,
          rooms_availability: roomsTotal,
          no_of_room: roomsTotal,
          free_child_without_bed_count:
            Number(grp.get('freeChildNoBedCount')?.value ?? 0) || 0,
          free_child_without_bed_age:
            grp.get('freeChildNoBedAge')?.value != null
              ? Number(grp.get('freeChildNoBedAge')?.value)
              : null,
          weekend_days: (this.getWeekendDays(rid).value || []) as string[],
          blackout_dates,
          extra_costs: roomExtraCosts,
          details: detailsForRoom
        });
      }
    }
    const formPrice = Number(this.form.get('pricePerNight')?.value ?? 0) || 0;
    const onePersonWeekday = allDetails.find(
      (d: any) =>
        Number(d.person) === 1 &&
        String(d.type) === 'week_days' &&
        Number(d.amount) > 0
    );
    const anyAmount = allDetails.filter((d: any) => Number(d.amount) > 0);
    const effectivePricePerNight =
      formPrice > 0
        ? formPrice
        : onePersonWeekday
          ? Number(onePersonWeekday.amount)
          : anyAmount.length
            ? Math.min(...anyAmount.map((d: any) => Number(d.amount)))
            : 0;
    const rulesArr = isRefundable
      ? this.fareRules.controls
          .map((c: any) => {
            const days = Number(c.get('days')?.value ?? 0);
            const amount = Number(c.get('amount')?.value ?? 0);
            const pct =
              effectivePricePerNight > 0
                ? Math.min(
                    100,
                    Math.max(0, (amount / effectivePricePerNight) * 100)
                  )
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
    const inventory = {
      hotel_id: hotelId,
      check_in_time: checkIn,
      check_out_time: checkOut,
      extra_costs: extraCosts,
      user_id: userId,
      room_detail: roomDetailsArr,
      is_refundable: isRefundable,
      refund_rules: rulesArr,
      price_per_night: effectivePricePerNight,
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
      markup_type:
        this.form.get('markupType')?.value === 'percentage'
          ? 'P'
          : this.form.get('markupType')?.value === 'flat'
            ? 'F'
            : null,
      markup_value:
        this.form.get('markupValue')?.value != null
          ? Number(this.form.get('markupValue')?.value)
          : null
    };
    return { type: this.mode, inventories: [inventory] };
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

  get blackoutDates(): FormArray {
    return this.form.get('blackoutDates') as FormArray;
  }
  onAddBlackoutDate(): void {
    if (this.mode !== 'normal') return;
    const val = this.form.get('blackoutDateInput')?.value;
    if (!val) return;
    const s = this.dateToStr(val);
    const exists = (this.blackoutDates.value as any[]).includes(s);
    if (!exists) this.blackoutDates.push(this.fb.control(s));
    this.form.patchValue({ blackoutDateInput: null });
  }
  onBlackoutDateSelected(val: any): void {
    if (this.mode !== 'normal') return;
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
  validateNormalMode(): string[] {
    const errors: string[] = [];
    const reqForm = [
      { key: 'countryId', label: 'Country' },
      { key: 'stateId', label: 'State' },
      { key: 'cityId', label: 'City' },
      { key: 'hotelId', label: 'Hotel' },
      { key: 'checkinTime', label: 'Check-In Time' },
      { key: 'checkoutTime', label: 'Check-Out Time' }
    ];
    reqForm.forEach((f) => {
      const v = this.form.get(f.key)?.value;
      if (v === null || v === undefined || String(v).toString().trim() === '') {
        errors.push(`${f.label} is required`);
      }
    });
    for (const rid of this.selectedRoomIds) {
      const grp = this.getRoomGroup(rid);
      const roomName = this.roomById(rid)?.room_name || String(rid);
      const fields = [
        { key: 'adults', label: 'Adult(s)' },
        { key: 'children', label: 'Child(s)' },
        { key: 'infants', label: 'Infant(s)' },
        { key: 'maxPersons', label: 'Max Person(s)' },
        { key: 'frontRoomsCount', label: 'No. of Rooms' }
      ];
      fields.forEach((f) => {
        const v = grp.get(f.key)?.value;
        if (
          v === null ||
          v === undefined ||
          String(v).toString().trim() === ''
        ) {
          errors.push(`${f.label} is required for ${roomName}`);
        }
      });
      if ((Number(grp.get('frontRoomsCount')?.value) || 0) < 1) {
        errors.push(`No. of Rooms must be at least 1 for ${roomName}`);
      }
      const ranges = this.getDateRanges(rid).controls;
      if (!ranges.length) {
        errors.push(`Select at least one date range for ${roomName}`);
      }
      const meals = this.getSelectedMeals(rid);
      if (!meals.length) {
        errors.push(`Select at least one meal type for ${roomName}`);
      }
      const extra = grp.get('extraCosts') as FormGroup | null;
      if (extra) {
        const checkExtra = (
          kind: 'adult' | 'child' | 'child_with_bed',
          label: string,
          day: 'weekday' | 'weekend'
        ) => {
          const dayGrp = extra.get(day) as FormGroup | null;
          const kindGrp = dayGrp?.get(kind) as FormGroup | null;
          meals.forEach((mk) => {
            const ctrl = kindGrp?.get(mk) as FormControl | null;
            if (!ctrl || !this.isNonEmptyNumeric(ctrl.value)) {
              const dayLabel = day === 'weekday' ? 'weekday' : 'week off';
              errors.push(
                `Extra ${label} ${dayLabel} ${mk} price is required for ${roomName}`
              );
            }
          });
        };
        checkExtra('child', 'child without bed', 'weekday');
        checkExtra('child_with_bed', 'child with bed', 'weekday');
        checkExtra('adult', 'bed per adult', 'weekday');
        if (this.hasWeekend(rid)) {
          checkExtra('child', 'child without bed', 'weekend');
          checkExtra('child_with_bed', 'child with bed', 'weekend');
          checkExtra('adult', 'bed per adult', 'weekend');
        }
      }
      const weekdayOk = this.isBasePricesComplete(rid, 'weekday');
      if (!weekdayOk) {
        const occKeys = this.getSelectedOccupancyKeys(rid);
        const occLabel =
          occKeys.length && /^p\d+$/.test(occKeys[0])
            ? `${Number(occKeys[0].slice(1))}-person`
            : 'base';
        errors.push(
          `Add ${occLabel} weekday prices for all meals for ${roomName}`
        );
      }
      if (this.hasWeekend(rid)) {
        const weekendOk = this.isBasePricesComplete(rid, 'weekend');
        if (!weekendOk) {
          const occKeys = this.getSelectedOccupancyKeys(rid);
          const occLabel =
            occKeys.length && /^p\d+$/.test(occKeys[0])
              ? `${Number(occKeys[0].slice(1))}-person`
              : 'base';
          errors.push(
            `Add ${occLabel} week off prices for all meals for ${roomName}`
          );
        }
      }
    }
    return errors;
  }

  getCurrentUserId(): number | null {
    const userStr =
      localStorage.getItem('user') || localStorage.getItem('userData');
    if (!userStr) return null;
    try {
      const u = JSON.parse(userStr as string);
      return Number(u?.id || u?.user_id || 0) || null;
    } catch {
      return null;
    }
  }

  removeDateRange(roomId: number, index: number): void {
    const arr = this.getDateRanges(roomId);
    if (index >= 0 && index < arr.length) arr.removeAt(index);
  }

  loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
  }

  onCountryChange(countryId: number): void {
    this.selectedCountryId = countryId || null;
    this.form.patchValue({
      countryId: this.selectedCountryId,
      stateId: null,
      cityId: null,
      hotelSearch: '',
      hotelId: null
    });
    this.form.get('stateId')?.enable();
    this.form.get('cityId')?.disable();
    this.form.get('hotelSearch')?.disable();
    this.states = [];
    this.cities = [];
    this.hotels = [];
    this.selectedStateId = null;
    this.selectedCityId = null;
    this.selectedCityName = '';
    if (countryId) {
      this.userService.getStatesByCountry(countryId).subscribe({
        next: (res: any) => {
          this.states = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {}
      });
    }
  }

  onStateChange(stateId: number): void {
    this.selectedStateId = stateId || null;
    this.form.patchValue({
      stateId: this.selectedStateId,
      cityId: null,
      hotelSearch: '',
      hotelId: null
    });
    this.form.get('cityId')?.enable();
    this.form.get('hotelSearch')?.disable();
    this.cities = [];
    this.hotels = [];
    this.selectedCityId = null;
    this.selectedCityName = '';
    if (stateId) {
      this.userService.getCitiesByState(stateId).subscribe({
        next: (res: any) => {
          this.cities = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {}
      });
    }
  }

  onCityChange(cityId: number): void {
    this.selectedCityId = cityId || null;
    this.form.patchValue({
      cityId: this.selectedCityId,
      hotelSearch: '',
      hotelId: null
    });
    this.form.get('hotelSearch')?.enable();
    const cityObj = this.cities.find(
      (c: any) => Number(c.id) === Number(cityId)
    );
    this.selectedCityName = cityObj ? cityObj.name || '' : '';
    this.hotels = [];
    this.hotelDetails = null;
    this.roomsSections = [];
    this.roomsFlat = [];
    this.selectedRoomIds = [];
  }
}
