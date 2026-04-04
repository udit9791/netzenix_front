import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from 'src/app/core/services/user.service';
import { HotelService } from 'src/app/services/hotel.service';
import {
  Observable,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map
} from 'rxjs';
import { environment } from 'src/environments/environment';

interface ItineraryDay {
  title: string;
  description: string;
  country_id: number | null;
  state_id: number | null;
  city_id: number | null;
  hotel_ids?: number[];
  default_hotel_id?: number | null;
  default_meal_plan_id?: {
    [hotelId: number]: number | null;
  };
  default_room_id?: {
    [hotelId: number]: number | null;
  };
  hotel_meal_plans?: Array<{
    hotel_id: number;
    inventory_id: number | null;
    meal_plan_ids: number[];
  }>;
  images?: string[];
}

@Component({
  selector: 'vex-itinerary-builder-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    RouterModule
  ],
  templateUrl: './itinerary-builder-form.component.html',
  styleUrls: ['./itinerary-builder-form.component.scss']
})
export class ItineraryBuilderFormComponent implements OnInit {
  form: FormGroup;
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  dayStates: any[][] = [];
  dayCities: any[][] = [];
  dayHotelQueryCtrls: FormControl[] = [];
  dayFilteredHotels$: Observable<any[]>[] = [];
  daySelectedHotels: Array<
    Array<{
      id: number;
      name: string;
      inventory_id: number | null;
      rooms?: Array<{ id: number; name: string }>;
      defaultRoomId?: number | null;
      mealPlans?: Array<{ id: number; name: string }>;
      selectedMealPlanIds?: number[];
      defaultMealPlanId?: number | null;
    }>
  > = [];
  dayDefaultHotelIds: Array<number | null> = [];
  dayImages: string[][] = [];
  dayImageFiles: File[][] = [];
  dayCountryFilterTexts: string[] = [];
  dayStateFilterTexts: string[] = [];
  dayCityFilterTexts: string[] = [];
  departureVehiclePrices: Array<{
    depart_from: string;
    vehicle_id: number;
    single_adult_price: number | null;
    single_child_price: number | null;
    max_occupancy_price: number | null;
  }> = [];
  departFromCtrl = new FormControl('');
  departFromList: string[] = [];
  vehicleOptions: Array<{
    id: number;
    vehicle_name: string;
    single_price: number | null;
    max_occupancy_price: number | null;
    type: string | null;
  }> = [];
  sicVehiclesList: Array<{
    id: number;
    vehicle_name: string;
    single_price: number | null;
    max_occupancy_price: number | null;
    type: string | null;
  }> = [];
  privateVehiclesList: Array<{
    id: number;
    vehicle_name: string;
    single_price: number | null;
    max_occupancy_price: number | null;
    type: string | null;
  }> = [];
  private apiUrl = environment.apiUrl;
  saving = false;
  bannerFileName: string | null = null;
  bannerFile: File | null = null;
  private isEdit = false;
  private itineraryId: number | null = null;
  defaultSicVehicleId: number | null = null;
  defaultPrivateVehicleId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private hotelService: HotelService,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      nights: [1, [Validators.required, Validators.min(1)]],
      maxSeats: [null, [Validators.required, Validators.min(1)]],
      country_id: [null],
      state_id: [null],
      city_id: [null],
      travelType: ['fit', Validators.required],
      fitStart: [null],
      fitEnd: [null],
      groupDates: this.fb.array([]),
      days: this.fb.array([]),
      sicVehicles: [[]],
      privateVehicles: [[]],
      vehicles: [[], Validators.required],
      markup: [null, [Validators.min(0)]],
      inclusions: [''],
      exclusions: [''],
      terms: [''],
      allowInstallmentPayment: [false],
      installments: this.fb.array([]),
      allowHoldBooking: [false],
      holdAmountType: ['percentage'],
      holdPercentage: [null],
      holdCutoffDays: [null],
      holdLimitHours: [null],
      refundPolicyType: ['non_refundable'],
      refundRules: this.fb.array([])
    });
    this.addDay();

    this.form.get('nights')?.valueChanges.subscribe((value) => {
      const nights = Number(value) || 0;
      const totalDays = nights > 0 ? nights + 1 : 1;
      this.syncDaysLength(totalDays);
    });
    this.setInstallmentCount(1);

    this.form.get('travelType')?.valueChanges.subscribe(() => {
      for (let i = 0; i < this.days.length; i++) {
        this.clearDayHotels(i);
      }
    });

    this.form.get('sicVehicles')?.valueChanges.subscribe(() => {
      this.mergeVehicleSelections();
      this.ensureDefaultVehicleSelections();
    });

    this.form.get('privateVehicles')?.valueChanges.subscribe(() => {
      this.mergeVehicleSelections();
      this.ensureDefaultVehicleSelections();
    });

    this.form.get('vehicles')?.valueChanges.subscribe(() => {
      this.syncDepartureVehiclePrices();
    });

    this.addRefundRule();
  }

  ngOnInit(): void {
    this.loadCountries();
    this.loadVehicles();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const idNum = Number(idParam || 0) || 0;
      if (idNum) {
        this.isEdit = true;
        this.itineraryId = idNum;
        this.loadItinerary(idNum);
      }
    }
  }

  get days(): FormArray {
    return this.form.get('days') as FormArray;
  }

  get groupDates(): FormArray {
    return this.form.get('groupDates') as FormArray;
  }

  get installments(): FormArray {
    return this.form.get('installments') as FormArray;
  }

  get refundRules(): FormArray {
    return this.form.get('refundRules') as FormArray;
  }

  getInstallmentsTotalPercentage(): number {
    if (!this.form.get('allowInstallmentPayment')?.value) {
      return 0;
    }
    const arr = this.installments;
    if (!arr || !arr.length) {
      return 0;
    }
    let total = 0;
    (arr.controls as FormGroup[]).forEach((grp) => {
      const v = Number(grp.get('percentage')?.value || 0);
      if (!Number.isNaN(v)) {
        total += v;
      }
    });
    return total;
  }

  getMaxInstallmentDays(): number {
    const travelType = this.form.get('travelType')?.value;
    let dates: any[] = [];
    if (travelType === 'group') {
      dates = this.groupDates.controls.map((c) => c.value).filter((v) => v);
    } else if (travelType === 'fit') {
      const fitStart = this.form.get('fitStart')?.value;
      if (fitStart) {
        dates = [fitStart];
      }
    }
    let earliest: Date | null = null;
    dates.forEach((val) => {
      let d: Date | null = null;
      if (val instanceof Date) {
        d = val;
      } else {
        const tmp = new Date(val);
        if (!isNaN(tmp.getTime())) {
          d = tmp;
        }
      }
      if (!d) {
        return;
      }
      if (!earliest || d.getTime() < earliest.getTime()) {
        earliest = d;
      }
    });
    if (!earliest) {
      const nightsCtrl = this.form.get('nights');
      const nights = Number(nightsCtrl?.value || 0);
      return nights > 0 ? nights + 1 : 0;
    }
    const earliestDate: Date = earliest as Date;
    const today = new Date();
    const start = new Date(
      earliestDate.getFullYear(),
      earliestDate.getMonth(),
      earliestDate.getDate()
    );
    const base = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffMs = start.getTime() - base.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  isInstallmentsTotalValid(): boolean {
    if (!this.form.get('allowInstallmentPayment')?.value) {
      return true;
    }
    const total = this.getInstallmentsTotalPercentage();
    return total === 100;
  }

  private setInstallmentCount(count: number): void {
    const arr = this.installments;
    const safe = Math.max(1, Math.min(Number(count || 0) || 1, 10));
    while (arr.length < safe) {
      arr.push(
        this.fb.group({
          daysAfterPrevious: [null],
          percentage: [null]
        })
      );
    }
    while (arr.length > safe) {
      arr.removeAt(arr.length - 1);
    }
  }

  onInstallmentCountInput(value: any): void {
    const num = Number(value || 0);
    const safe = !num || num < 1 ? 1 : num > 10 ? 10 : num;
    this.setInstallmentCount(safe);
  }

  addRefundRule(): void {
    this.refundRules.push(
      this.fb.group({
        daysBeforeDeparture: [null, [Validators.min(0)]],
        penaltyAmount: [null, [Validators.min(0)]]
      })
    );
  }

  removeRefundRule(index: number): void {
    if (index >= 0 && index < this.refundRules.length) {
      this.refundRules.removeAt(index);
    }
  }

  addDay(): void {
    const dayGroup = this.fb.group({
      title: [''],
      description: [''],
      country_id: [null],
      state_id: [null],
      city_id: [null]
    });
    this.days.push(dayGroup);
    this.dayStates.push([]);
    this.dayCities.push([]);
    this.dayImages.push([]);
    const index = this.days.length - 1;
    const hotelCtrl = new FormControl('');
    this.dayHotelQueryCtrls[index] = hotelCtrl;
    this.daySelectedHotels[index] = [];
    this.dayDefaultHotelIds[index] = null;
    this.dayFilteredHotels$[index] = hotelCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const query = String(q || '').trim();
        const day = this.days.at(index) as FormGroup;
        const cityId =
          Number(
            day.get('city_id')?.value !== undefined
              ? day.get('city_id')?.value
              : 0
          ) || 0;
        if (!query || !cityId) {
          return of([]);
        }
        const travelType = String(
          this.form.get('travelType')?.value || 'fit'
        ).toLowerCase();
        return this.hotelService
          .getBookingHotelsByType(travelType, cityId, query)
          .pipe(
            map((res: any) => {
              const rows = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res)
                  ? res
                  : [];
              return rows.map((h: any) => {
                const id = Number(h?.hotel_id ?? h?.id ?? 0) || 0;
                const name = (h?.hotel_name || h?.name || '') as string;
                const inventoryId = Number(h?.inventory_id ?? 0) || null;
                return { id, name, inventory_id: inventoryId };
              });
            })
          );
      })
    );
  }

  removeDay(index: number): void {
    if (index >= 0 && index < this.days.length) {
      this.days.removeAt(index);
      this.dayStates.splice(index, 1);
      this.dayCities.splice(index, 1);
      this.dayHotelQueryCtrls.splice(index, 1);
      this.dayFilteredHotels$.splice(index, 1);
      this.daySelectedHotels.splice(index, 1);
      this.dayDefaultHotelIds.splice(index, 1);
      this.dayImages.splice(index, 1);
    }
  }

  onGroupDateSelected(event: any): void {
    const date: Date | null = event?.value || null;
    if (!date) {
      return;
    }
    const iso = date.toISOString().split('T')[0];
    const exists = this.groupDates.controls.some((c) => {
      const v = c.value;
      if (!v) {
        return false;
      }
      const d = new Date(v);
      return d.toISOString().split('T')[0] === iso;
    });
    if (!exists) {
      this.groupDates.push(this.fb.control(date));
    }
  }

  removeGroupDate(index: number): void {
    if (index >= 0 && index < this.groupDates.length) {
      this.groupDates.removeAt(index);
    }
  }

  addDepartFrom(): void {
    const raw = String(this.departFromCtrl.value || '').trim();
    if (!raw) {
      return;
    }
    const existsSame =
      this.departFromList.length &&
      this.departFromList[0].toLowerCase() === raw.toLowerCase();
    if (!existsSame) {
      this.departFromList = [raw];
      this.syncDepartureVehiclePrices();
    }
    this.departFromCtrl.setValue('');
  }

  removeDepartFrom(index: number): void {
    if (index < 0 || index >= this.departFromList.length) {
      return;
    }
    const copy = [...this.departFromList];
    copy.splice(index, 1);
    this.departFromList = copy;
    this.syncDepartureVehiclePrices();
  }

  getVehicleType(id: number): string | null {
    const v = this.vehicleOptions.find((opt) => opt.id === id);
    return v && v.type ? String(v.type) : null;
  }

  get selectedSicVehicles(): {
    id: number;
    vehicle_name: string;
    single_price: number | null;
    max_occupancy_price: number | null;
    type: string | null;
  }[] {
    const idsRaw = this.form.get('sicVehicles')?.value;
    const ids: number[] = Array.isArray(idsRaw)
      ? idsRaw.map((v: any) => Number(v || 0) || 0)
      : [];
    if (!ids.length) {
      return [];
    }
    return this.sicVehiclesList.filter((v) => ids.includes(v.id));
  }

  get selectedPrivateVehicles(): {
    id: number;
    vehicle_name: string;
    single_price: number | null;
    max_occupancy_price: number | null;
    type: string | null;
  }[] {
    const idsRaw = this.form.get('privateVehicles')?.value;
    const ids: number[] = Array.isArray(idsRaw)
      ? idsRaw.map((v: any) => Number(v || 0) || 0)
      : [];
    if (!ids.length) {
      return [];
    }
    return this.privateVehiclesList.filter((v) => ids.includes(v.id));
  }

  setDefaultSic(vehicleId: number): void {
    const sicSelected: number[] = Array.isArray(
      this.form.get('sicVehicles')?.value
    )
      ? (this.form.get('sicVehicles')?.value as number[])
      : [];
    if (!sicSelected.includes(vehicleId)) {
      return;
    }
    this.defaultSicVehicleId = vehicleId;
    if (vehicleId) {
      this.applyDefaultSicPrices(vehicleId);
    }
  }

  setDefaultPrivate(vehicleId: number): void {
    const privateSelected: number[] = Array.isArray(
      this.form.get('privateVehicles')?.value
    )
      ? (this.form.get('privateVehicles')?.value as number[])
      : [];
    if (!privateSelected.includes(vehicleId)) {
      return;
    }
    this.defaultPrivateVehicleId = vehicleId;
    if (vehicleId) {
      this.applyDefaultPrivatePrices(vehicleId);
    }
  }

  private ensureDefaultVehicleSelections(): void {
    const sicRaw = this.form.get('sicVehicles')?.value;
    const sicIds: number[] = Array.isArray(sicRaw)
      ? sicRaw.map((v: any) => Number(v || 0) || 0).filter((v) => !!v)
      : [];
    if (!sicIds.length) {
      this.defaultSicVehicleId = null;
    } else if (
      !this.defaultSicVehicleId ||
      !sicIds.includes(this.defaultSicVehicleId)
    ) {
      this.defaultSicVehicleId = sicIds[0];
    }

    const privateRaw = this.form.get('privateVehicles')?.value;
    const privateIds: number[] = Array.isArray(privateRaw)
      ? privateRaw.map((v: any) => Number(v || 0) || 0).filter((v) => !!v)
      : [];
    if (!privateIds.length) {
      this.defaultPrivateVehicleId = null;
    } else if (
      !this.defaultPrivateVehicleId ||
      !privateIds.includes(this.defaultPrivateVehicleId)
    ) {
      this.defaultPrivateVehicleId = privateIds[0];
    }
  }

  private applyDefaultSicPrices(vehicleId: number): void {
    if (!vehicleId) {
      return;
    }
    const anyRow = this.departureVehiclePrices.find(
      (p) => p.vehicle_id === vehicleId
    );
    let baseAdult: number | null =
      anyRow && anyRow.single_adult_price != null
        ? anyRow.single_adult_price
        : null;
    let baseChild: number | null =
      anyRow && anyRow.single_child_price != null
        ? anyRow.single_child_price
        : null;
    if (baseAdult === null) {
      const vehicle = this.vehicleOptions.find((v) => v.id === vehicleId);
      if (vehicle && vehicle.single_price != null) {
        baseAdult = vehicle.single_price;
      }
    }
    if (baseAdult === null && baseChild === null) {
      return;
    }
    this.departFromList.forEach((city) => {
      const item = this.departureVehiclePrices.find(
        (p) => p.depart_from === city && p.vehicle_id === vehicleId
      );
      if (!item) {
        return;
      }
      if (baseAdult !== null) {
        item.single_adult_price = baseAdult;
      }
      if (baseChild !== null) {
        item.single_child_price = baseChild;
      }
    });
  }

  private applyDefaultPrivatePrices(vehicleId: number): void {
    if (!vehicleId) {
      return;
    }
    const anyRow = this.departureVehiclePrices.find(
      (p) => p.vehicle_id === vehicleId
    );
    let baseMax: number | null =
      anyRow && anyRow.max_occupancy_price != null
        ? anyRow.max_occupancy_price
        : null;
    if (baseMax === null) {
      const vehicle = this.vehicleOptions.find((v) => v.id === vehicleId);
      if (vehicle && vehicle.max_occupancy_price != null) {
        baseMax = vehicle.max_occupancy_price;
      }
    }
    if (baseMax === null) {
      return;
    }
    this.departFromList.forEach((city) => {
      const item = this.departureVehiclePrices.find(
        (p) => p.depart_from === city && p.vehicle_id === vehicleId
      );
      if (item) {
        item.max_occupancy_price = baseMax;
      }
    });
  }

  private mergeVehicleSelections(): void {
    const sicRaw = this.form.get('sicVehicles')?.value;
    const privateRaw = this.form.get('privateVehicles')?.value;
    const combined = [
      ...(Array.isArray(sicRaw) ? sicRaw : []),
      ...(Array.isArray(privateRaw) ? privateRaw : [])
    ];
    const merged = combined
      .map((v: any) => Number(v || 0) || 0)
      .filter(
        (v: number, i: number, arr: number[]) => v && arr.indexOf(v) === i
      );
    this.form.get('vehicles')?.setValue(merged);
  }

  private syncVehicleTypeSelectionsFromVehicles(): void {
    const vehiclesRaw = this.form.get('vehicles')?.value;
    const ids: number[] = Array.isArray(vehiclesRaw)
      ? vehiclesRaw
          .map((v: any) => Number(v || 0) || 0)
          .filter(
            (v: number, i: number, arr: number[]) => v && arr.indexOf(v) === i
          )
      : [];
    if (!ids.length) {
      this.form.get('sicVehicles')?.setValue([]);
      this.form.get('privateVehicles')?.setValue([]);
      return;
    }
    const sicIds: number[] = [];
    const privateIds: number[] = [];
    ids.forEach((id) => {
      const type = (this.getVehicleType(id) || 'private')
        .toString()
        .toLowerCase();
      if (type === 'sic') {
        sicIds.push(id);
      } else if (type === 'private') {
        privateIds.push(id);
      }
    });
    this.form.get('sicVehicles')?.setValue(sicIds);
    this.form.get('privateVehicles')?.setValue(privateIds);
    this.ensureDefaultVehicleSelections();
  }

  private syncDepartureVehiclePrices(): void {
    const vehiclesValRaw = this.form.get('vehicles')?.value;
    const vehiclesVal: number[] = Array.isArray(vehiclesValRaw)
      ? vehiclesValRaw
          .map((v: any) => Number(v || 0) || 0)
          .filter(
            (v: number, i: number, arr: number[]) => v && arr.indexOf(v) === i
          )
      : [];
    const departures = this.departFromList;
    const updated: Array<{
      depart_from: string;
      vehicle_id: number;
      single_adult_price: number | null;
      single_child_price: number | null;
      max_occupancy_price: number | null;
    }> = [];

    departures.forEach((city) => {
      vehiclesVal.forEach((vid) => {
        const existing = this.departureVehiclePrices.find(
          (p) => p.depart_from === city && p.vehicle_id === vid
        );
        const base = this.vehicleOptions.find((v) => v.id === vid);
        updated.push({
          depart_from: city,
          vehicle_id: vid,
          single_adult_price:
            existing?.single_adult_price ??
            (base && base.single_price != null ? base.single_price : null),
          single_child_price: existing?.single_child_price ?? null,
          max_occupancy_price:
            existing?.max_occupancy_price ??
            (base && base.max_occupancy_price != null
              ? base.max_occupancy_price
              : null)
        });
      });
    });

    this.departureVehiclePrices = updated;
  }

  private loadVehicles(): void {
    this.http.get<any>(`${this.apiUrl}/transportations/list`).subscribe({
      next: (res) => {
        const raw =
          Array.isArray(res?.data) || Array.isArray(res)
            ? Array.isArray(res?.data)
              ? res.data
              : res
            : [];
        const list = Array.isArray(raw) ? raw : [];
        this.vehicleOptions = list
          .map((t: any) => {
            const id = t?.id ?? t?.transportation_id ?? t?.vehicle_id ?? null;
            const vehicleName =
              t?.vehicle_name ?? t?.vehicleName ?? t?.name ?? '';
            const typeRaw = t?.type ?? null;
            const normalizedType =
              typeof typeRaw === 'string' && typeRaw.trim()
                ? String(typeRaw).trim().toLowerCase()
                : 'private';
            return {
              id: Number(id || 0) || 0,
              vehicle_name: String(vehicleName || ''),
              single_price: t?.single_price ?? t?.price_per_person ?? null,
              max_occupancy_price:
                t?.max_occupancy_price ?? t?.maxOccupancyPrice ?? null,
              type: normalizedType
            };
          })
          .filter((v) => v.id && v.vehicle_name);
        this.sicVehiclesList = this.vehicleOptions.filter(
          (v) => v.type === 'sic'
        );
        this.privateVehiclesList = this.vehicleOptions.filter(
          (v) => v.type === 'private'
        );
        this.syncVehicleTypeSelectionsFromVehicles();
      },
      error: () => {
        this.vehicleOptions = [];
      }
    });
  }

  loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {
        this.countries = [];
      }
    });
  }

  private loadItinerary(id: number): void {
    this.http.get<any>(`${this.apiUrl}/itineraries/${id}`).subscribe({
      next: (res) => {
        const data = res && res.data ? res.data : res;
        if (!data) {
          return;
        }
        this.form.patchValue({
          name: data.name || '',
          description: data.description || '',
          nights:
            data.nights !== undefined && data.nights !== null
              ? Number(data.nights) || 1
              : 1,
          maxSeats:
            data.maxSeats !== undefined && data.maxSeats !== null
              ? Number(data.maxSeats) || null
              : null,
          country_id:
            data.country_id !== undefined && data.country_id !== null
              ? Number(data.country_id)
              : null,
          state_id:
            data.state_id !== undefined && data.state_id !== null
              ? Number(data.state_id)
              : null,
          city_id:
            data.city_id !== undefined && data.city_id !== null
              ? Number(data.city_id)
              : null,
          travelType: data.travelType || 'fit',
          fitStart: data.fitStart || null,
          fitEnd: data.fitEnd || null,
          markup:
            data.markup !== undefined && data.markup !== null
              ? Number(data.markup) || 0
              : null,
          inclusions: data.inclusions || '',
          exclusions: data.exclusions || '',
          terms: data.terms || '',
          allowInstallmentPayment: !!data.allowInstallmentPayment
        });

        while (this.groupDates.length) {
          this.groupDates.removeAt(0);
        }
        const gdList = Array.isArray(data.groupDates) ? data.groupDates : [];
        gdList.forEach((val: any) => {
          if (!val) {
            return;
          }
          const dateObj =
            val instanceof Date ? val : new Date(String(val as any));
          this.groupDates.push(this.fb.control(dateObj));
        });

        this.departFromList = Array.isArray(data.depart_from)
          ? data.depart_from
              .map((v: any) => String(v || ''))
              .filter((v: string) => !!v)
          : [];
        const sicIds = Array.isArray(data.sic_vehicle_ids)
          ? data.sic_vehicle_ids.map((v: any) => Number(v || 0) || 0)
          : [];
        const privateIds = Array.isArray(data.private_vehicle_ids)
          ? data.private_vehicle_ids.map((v: any) => Number(v || 0) || 0)
          : [];
        const vehicles = [
          ...sicIds,
          ...privateIds,
          ...(Array.isArray(data.vehicle_ids)
            ? data.vehicle_ids.map((v: any) => Number(v || 0) || 0)
            : [])
        ]
          .map((v: number) => Number(v || 0) || 0)
          .filter(
            (v: number, i: number, arr: number[]) => v && arr.indexOf(v) === i
          );
        this.form.get('sicVehicles')?.setValue(sicIds);
        this.form.get('privateVehicles')?.setValue(privateIds);
        this.form.get('vehicles')?.setValue(vehicles);

        const baseVehiclePrices = Array.isArray(data.vehicle_prices)
          ? data.vehicle_prices
          : [];
        const defaultSic = baseVehiclePrices.find(
          (vp: any) =>
            String(vp.type || '').toLowerCase() === 'sic' &&
            (vp.is_default === 1 ||
              vp.is_default === true ||
              vp.is_default === '1')
        );
        if (defaultSic && defaultSic.vehicle_id) {
          this.defaultSicVehicleId = Number(defaultSic.vehicle_id) || null;
        }
        const defaultPrivate = baseVehiclePrices.find(
          (vp: any) =>
            String(vp.type || '').toLowerCase() === 'private' &&
            (vp.is_default === 1 ||
              vp.is_default === true ||
              vp.is_default === '1')
        );
        if (defaultPrivate && defaultPrivate.vehicle_id) {
          this.defaultPrivateVehicleId =
            Number(defaultPrivate.vehicle_id) || null;
        }

        const depVehicleRaw = Array.isArray(data.departure_vehicle_prices)
          ? data.departure_vehicle_prices
          : [];
        if (depVehicleRaw.length) {
          this.departureVehiclePrices = depVehicleRaw
            .map((dp: any) => ({
              depart_from: String(dp.depart_from || ''),
              vehicle_id:
                dp.vehicle_id !== undefined && dp.vehicle_id !== null
                  ? Number(dp.vehicle_id) || 0
                  : 0,
              single_adult_price:
                dp.single_adult_price !== undefined &&
                dp.single_adult_price !== null
                  ? Number(dp.single_adult_price)
                  : dp.single_price !== undefined && dp.single_price !== null
                    ? Number(dp.single_price)
                    : null,
              single_child_price:
                dp.single_child_price !== undefined &&
                dp.single_child_price !== null
                  ? Number(dp.single_child_price)
                  : null,
              max_occupancy_price:
                dp.max_occupancy_price !== undefined &&
                dp.max_occupancy_price !== null
                  ? Number(dp.max_occupancy_price)
                  : null
            }))
            .filter(
              (x: {
                depart_from: string;
                vehicle_id: number;
                single_adult_price: number | null;
                single_child_price: number | null;
                max_occupancy_price: number | null;
              }) =>
                !!x.depart_from &&
                !!x.vehicle_id &&
                this.departFromList.includes(x.depart_from) &&
                vehicles.includes(x.vehicle_id)
            );
        } else {
          this.departureVehiclePrices = [];
          this.departFromList.forEach((city) => {
            vehicles.forEach((vid: number) => {
              const base = baseVehiclePrices.find(
                (vp: any) => Number(vp.vehicle_id || 0) === vid
              );
              this.departureVehiclePrices.push({
                depart_from: city,
                vehicle_id: vid,
                single_adult_price:
                  base &&
                  base.single_adult_price !== undefined &&
                  base.single_adult_price !== null
                    ? Number(base.single_adult_price)
                    : base &&
                        base.single_price !== undefined &&
                        base.single_price !== null
                      ? Number(base.single_price)
                      : null,
                single_child_price: null,
                max_occupancy_price:
                  base &&
                  base.max_occupancy_price !== undefined &&
                  base.max_occupancy_price !== null
                    ? Number(base.max_occupancy_price)
                    : null
              });
            });
          });
        }

        while (this.days.length) {
          this.removeDay(0);
        }

        const days = Array.isArray(data.days) ? data.days : [];
        days.forEach((d: any, index: number) => {
          this.addDay();
          const dayGroup = this.days.at(index) as FormGroup;
          dayGroup.patchValue({
            title: d.title || '',
            description: d.description || '',
            country_id:
              d.country_id !== undefined && d.country_id !== null
                ? Number(d.country_id)
                : null,
            state_id:
              d.state_id !== undefined && d.state_id !== null
                ? Number(d.state_id)
                : null,
            city_id:
              d.city_id !== undefined && d.city_id !== null
                ? Number(d.city_id)
                : null
          });

          const dayCountryId = dayGroup.get('country_id')?.value;
          if (dayCountryId) {
            this.userService.getStatesByCountry(dayCountryId).subscribe({
              next: (res: any) => {
                this.dayStates[index] = Array.isArray(res)
                  ? res
                  : res?.data
                    ? res.data
                    : [];
                const dayStateId = dayGroup.get('state_id')?.value;
                if (dayStateId) {
                  this.userService.getCitiesByState(dayStateId).subscribe({
                    next: (res2: any) => {
                      this.dayCities[index] = Array.isArray(res2)
                        ? res2
                        : res2?.data
                          ? res2.data
                          : [];
                    },
                    error: () => {
                      this.dayCities[index] = [];
                    }
                  });
                }
              },
              error: () => {
                this.dayStates[index] = [];
                this.dayCities[index] = [];
              }
            });
          }

          const hotelIdsRaw = Array.isArray(d.hotel_ids) ? d.hotel_ids : [];
          const hotelIds = hotelIdsRaw
            .map((v: any) => Number(v || 0) || 0)
            .filter(
              (v: number, i: number, arr: number[]) => v && arr.indexOf(v) === i
            );
          const mealPlansRaw = Array.isArray(d.hotel_meal_plans)
            ? d.hotel_meal_plans
            : [];
          const hotelDetailsRaw = Array.isArray((d as any).hotels)
            ? (d as any).hotels
            : [];
          const defaultHotel =
            d.default_hotel_id !== undefined && d.default_hotel_id !== null
              ? Number(d.default_hotel_id) || null
              : null;
          const dayDefaultRoomId =
            d.default_room_id !== undefined && d.default_room_id !== null
              ? Number(d.default_room_id) || null
              : null;
          const hotelsForDay: Array<{
            id: number;
            name: string;
            inventory_id: number | null;
            mealPlans?: Array<{ id: number; name: string }>;
            selectedMealPlanIds?: number[];
            defaultMealPlanId?: number | null;
            defaultRoomId?: number | null;
          }> = [];

          hotelIds.forEach((hid: number) => {
            const hotelDetail = hotelDetailsRaw.find(
              (h: any) => Number(h?.id || 0) === hid
            );
            const mp = mealPlansRaw.find(
              (m: any) => Number(m.hotel_id || 0) === hid
            );
            const inventoryId =
              mp && mp.inventory_id !== undefined && mp.inventory_id !== null
                ? Number(mp.inventory_id) || null
                : null;
            const mpIdsRaw =
              mp && Array.isArray(mp.meal_plan_ids) ? mp.meal_plan_ids : [];
            const mpIds = mpIdsRaw
              .map((v: any) => Number(v || 0) || 0)
              .filter(
                (v: number, i: number, arr: number[]) =>
                  v && arr.indexOf(v) === i
              );
            const defaultMpId = mpIds.length ? mpIds[0] : null;
            const hotelName =
              hotelDetail && hotelDetail.name
                ? String(hotelDetail.name)
                : `Hotel #${hid}`;
            const isDefaultHotel =
              defaultHotel !== null && hid === defaultHotel;
            hotelsForDay.push({
              id: hid,
              name: hotelName,
              inventory_id: inventoryId,
              mealPlans: [],
              selectedMealPlanIds: mpIds,
              defaultMealPlanId: defaultMpId,
              defaultRoomId: isDefaultHotel ? dayDefaultRoomId : null
            });
          });

          this.daySelectedHotels[index] = hotelsForDay;

          if (defaultHotel && hotelIds.includes(defaultHotel)) {
            this.dayDefaultHotelIds[index] = defaultHotel;
          } else if (hotelIds.length) {
            this.dayDefaultHotelIds[index] = hotelIds[0];
          } else {
            this.dayDefaultHotelIds[index] = null;
          }

          hotelsForDay.forEach((_, hIdx) => {
            this.loadHotelMealPlansForDay(index, hIdx);
          });

          const imgsRaw = Array.isArray(d.images) ? d.images : [];
          this.dayImages[index] = imgsRaw
            .map((v: any) => String(v || ''))
            .filter((v: string) => !!v);
        });

        while (this.installments.length) {
          this.installments.removeAt(0);
        }
        const allowInstallments = !!data.allowInstallmentPayment;
        const installmentsFromApi = Array.isArray(data.installments)
          ? data.installments
          : [];
        if (allowInstallments && installmentsFromApi.length) {
          installmentsFromApi.forEach((ins: any, idx: number) => {
            this.installments.push(
              this.fb.group({
                daysAfterPrevious:
                  ins.days_after_previous !== undefined &&
                  ins.days_after_previous !== null
                    ? Number(ins.days_after_previous)
                    : idx === 0
                      ? 0
                      : null,
                percentage:
                  ins.percentage !== undefined && ins.percentage !== null
                    ? Number(ins.percentage)
                    : null
              })
            );
          });
        } else {
          this.setInstallmentCount(1);
        }
      },
      error: () => {}
    });
  }

  onCountryChange(countryId: number | null): void {
    const id = countryId || null;
    this.states = [];
    this.cities = [];
    this.form.patchValue({
      country_id: id,
      state_id: null,
      city_id: null
    });
    if (id) {
      this.userService.getStatesByCountry(id).subscribe({
        next: (res: any) => {
          this.states = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {
          this.states = [];
        }
      });
    }
  }

  onStateChange(stateId: number | null): void {
    const id = stateId || null;
    this.cities = [];
    this.form.patchValue({
      state_id: id,
      city_id: null
    });
    if (id) {
      this.userService.getCitiesByState(id).subscribe({
        next: (res: any) => {
          this.cities = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {
          this.cities = [];
        }
      });
    }
  }

  onDayCountryChange(index: number, countryId: number | null): void {
    if (index < 0 || index >= this.days.length) {
      return;
    }
    const id = countryId || null;
    const dayGroup = this.days.at(index) as FormGroup;
    dayGroup.patchValue({
      country_id: id,
      state_id: null,
      city_id: null
    });
    this.dayStates[index] = [];
    this.dayCities[index] = [];
    this.clearDayHotels(index);
    if (id) {
      this.userService.getStatesByCountry(id).subscribe({
        next: (res: any) => {
          this.dayStates[index] = Array.isArray(res)
            ? res
            : res?.data
              ? res.data
              : [];
        },
        error: () => {
          this.dayStates[index] = [];
        }
      });
    }
  }

  onDayStateChange(index: number, stateId: number | null): void {
    if (index < 0 || index >= this.days.length) {
      return;
    }
    const id = stateId || null;
    const dayGroup = this.days.at(index) as FormGroup;
    dayGroup.patchValue({
      state_id: id,
      city_id: null
    });
    this.dayCities[index] = [];
    this.clearDayHotels(index);
    if (id) {
      this.userService.getCitiesByState(id).subscribe({
        next: (res: any) => {
          this.dayCities[index] = Array.isArray(res)
            ? res
            : res?.data
              ? res.data
              : [];
        },
        error: () => {
          this.dayCities[index] = [];
        }
      });
    }
  }

  onDayCityChange(index: number, cityId: number | null): void {
    if (index < 0 || index >= this.days.length) {
      return;
    }
    const id = cityId || null;
    const dayGroup = this.days.at(index) as FormGroup;
    dayGroup.patchValue({
      city_id: id
    });
    this.clearDayHotels(index);
  }

  displayHotel(h: any): string {
    if (!h) {
      return '';
    }
    const name = h.name || h.hotel_name || (h.id ? `Hotel #${h.id}` : '');
    return String(name || '');
  }

  addDayHotel(index: number, hotel: any): void {
    if (index < 0 || index >= this.days.length || !hotel) {
      return;
    }
    const id = Number(hotel.id ?? hotel.hotel_id ?? 0) || 0;
    const name = (hotel.name ||
      hotel.hotel_name ||
      (id ? `Hotel #${id}` : '')) as string;
    const inventoryId = Number(hotel.inventory_id ?? 0) || null;
    if (!id || !name) {
      return;
    }
    const list = this.daySelectedHotels[index] || [];
    const exists = list.some((h) => h.id === id);
    if (!exists) {
      const updated = [
        ...list,
        {
          id,
          name,
          inventory_id: inventoryId,
          mealPlans: [],
          selectedMealPlanIds: [],
          defaultMealPlanId: null
        }
      ];
      this.daySelectedHotels[index] = updated;
      if (!this.dayDefaultHotelIds[index]) {
        this.dayDefaultHotelIds[index] = id;
      }
      const hotelIndex = updated.length - 1;
      this.loadHotelMealPlansForDay(index, hotelIndex);
    }
    const ctrl = this.dayHotelQueryCtrls[index];
    if (ctrl) {
      ctrl.setValue('');
    }
  }

  removeDayHotel(index: number, hotelId: number): void {
    if (index < 0 || index >= this.days.length) {
      return;
    }
    const id = Number(hotelId || 0) || 0;
    const list = this.daySelectedHotels[index] || [];
    this.daySelectedHotels[index] = list.filter((h) => h.id !== id);
    if (this.dayDefaultHotelIds[index] === id) {
      const next = this.daySelectedHotels[index][0];
      this.dayDefaultHotelIds[index] = next ? next.id : null;
    }
  }

  setDefaultDayHotel(index: number, hotelId: number): void {
    if (index < 0 || index >= this.days.length) {
      return;
    }
    const id = Number(hotelId || 0) || 0;
    const list = this.daySelectedHotels[index] || [];
    const exists = list.some((h) => h.id === id);
    if (exists) {
      this.dayDefaultHotelIds[index] = id;
    }
  }

  private clearDayHotels(index: number): void {
    if (index < 0 || index >= this.days.length) {
      return;
    }
    this.daySelectedHotels[index] = [];
    this.dayDefaultHotelIds[index] = null;
    const ctrl = this.dayHotelQueryCtrls[index];
    if (ctrl) {
      ctrl.setValue('');
    }
  }

  loadHotelMealPlansForDay(dayIndex: number, hotelIndex: number): void {
    if (dayIndex < 0 || dayIndex >= this.daySelectedHotels.length) {
      return;
    }
    const list = this.daySelectedHotels[dayIndex] || [];
    if (hotelIndex < 0 || hotelIndex >= list.length) {
      return;
    }
    const hotel = list[hotelIndex];
    const hotelId = hotel && hotel.id ? Number(hotel.id) : null;
    const inventoryId =
      hotel && hotel.inventory_id ? Number(hotel.inventory_id) : null;

    if (hotelId) {
      this.hotelService.getInventoryRooms(hotelId).subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          const rooms = rows.map((r: any) => ({
            id: Number(r.id || 0) || 0,
            name: String(r.room_name || '')
          }));
          const updatedList = [...this.daySelectedHotels[dayIndex]];
          const target = { ...updatedList[hotelIndex] };
          target.rooms = rooms;
          if (
            target.defaultRoomId &&
            !rooms.some((rm: any) => rm.id === target.defaultRoomId)
          ) {
            target.defaultRoomId = rooms.length ? rooms[0].id : null;
          }
          updatedList[hotelIndex] = target;
          this.daySelectedHotels[dayIndex] = updatedList;
        },
        error: () => {}
      });
    }

    if (!inventoryId) {
      return;
    }

    this.hotelService.getInventoryMealPlans(inventoryId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const updatedList = [...this.daySelectedHotels[dayIndex]];
        const target = { ...updatedList[hotelIndex] };
        const mealPlans = rows.map((r: any) => ({
          id: Number(r.id || 0) || 0,
          name: String(r.name || '')
        }));
        target.mealPlans = mealPlans;
        if (target.selectedMealPlanIds && target.selectedMealPlanIds.length) {
          const allowedIds = new Set(mealPlans.map((m: any) => m.id));
          target.selectedMealPlanIds = target.selectedMealPlanIds.filter((id) =>
            allowedIds.has(id)
          );
        } else {
          target.selectedMealPlanIds = [];
        }
        if (
          target.defaultMealPlanId &&
          !target.selectedMealPlanIds.includes(target.defaultMealPlanId)
        ) {
          target.defaultMealPlanId = target.selectedMealPlanIds.length
            ? target.selectedMealPlanIds[0]
            : null;
        }
        updatedList[hotelIndex] = target;
        this.daySelectedHotels[dayIndex] = updatedList;
      },
      error: () => {}
    });
  }

  onHotelMealPlansChange(
    dayIndex: number,
    hotelId: number,
    selectedIds: number[]
  ): void {
    if (dayIndex < 0 || dayIndex >= this.daySelectedHotels.length) {
      return;
    }
    const list = this.daySelectedHotels[dayIndex] || [];
    const idx = list.findIndex((h) => h.id === Number(hotelId || 0));
    if (idx === -1) {
      return;
    }
    const updatedList = [...list];
    const target = { ...updatedList[idx] };
    const ids = Array.isArray(selectedIds) ? selectedIds : [];
    target.selectedMealPlanIds = ids
      .map((v) => Number(v || 0) || 0)
      .filter((v, i, arr) => v && arr.indexOf(v) === i);
    if (
      target.defaultMealPlanId &&
      !target.selectedMealPlanIds.includes(target.defaultMealPlanId)
    ) {
      target.defaultMealPlanId = target.selectedMealPlanIds.length
        ? target.selectedMealPlanIds[0]
        : null;
    }
    updatedList[idx] = target;
    this.daySelectedHotels[dayIndex] = updatedList;
  }

  setDefaultHotelMealPlan(
    dayIndex: number,
    hotelId: number,
    mealPlanId: number
  ): void {
    if (dayIndex < 0 || dayIndex >= this.daySelectedHotels.length) {
      return;
    }
    const list = this.daySelectedHotels[dayIndex] || [];
    const idx = list.findIndex((h) => h.id === Number(hotelId || 0));
    if (idx === -1) {
      return;
    }
    const updatedList = [...list];
    const target = { ...updatedList[idx] };
    const id = Number(mealPlanId || 0) || 0;
    if (!id || !target.selectedMealPlanIds?.includes(id)) {
      return;
    }
    target.defaultMealPlanId = id;
    updatedList[idx] = target;
    this.daySelectedHotels[dayIndex] = updatedList;
  }

  getDefaultHotelMealPlanId(h: any): number | null {
    if (!h) {
      return null;
    }
    const ids = Array.isArray(h.selectedMealPlanIds)
      ? h.selectedMealPlanIds
      : [];
    if (!ids.length) {
      return null;
    }
    const d = Number(h.defaultMealPlanId || 0) || 0;
    if (d && ids.includes(d)) {
      return d;
    }
    return ids[0];
  }

  getDefaultHotelRoomId(h: any): number | null {
    if (!h) {
      return null;
    }
    const rooms = Array.isArray(h.rooms) ? h.rooms : [];
    if (!rooms.length) {
      return null;
    }
    const d = Number(h.defaultRoomId || 0) || 0;
    if (d && rooms.some((rm: any) => rm.id === d)) {
      return d;
    }
    return rooms[0].id;
  }

  setDefaultHotelRoom(dayIndex: number, hotelId: number, roomId: number): void {
    if (dayIndex < 0 || dayIndex >= this.daySelectedHotels.length) {
      return;
    }
    const list = this.daySelectedHotels[dayIndex] || [];
    const idx = list.findIndex((h) => h.id === Number(hotelId || 0));
    if (idx === -1) {
      return;
    }
    const updatedList = [...list];
    const target = { ...updatedList[idx] };
    const rooms = Array.isArray(target.rooms) ? target.rooms : [];
    const id = Number(roomId || 0) || 0;
    if (!id || !rooms.some((rm: any) => rm.id === id)) {
      return;
    }
    target.defaultRoomId = id;
    updatedList[idx] = target;
    this.daySelectedHotels[dayIndex] = updatedList;
  }

  private syncDaysLength(totalDays: number): void {
    if (totalDays < 1) {
      totalDays = 1;
    }
    while (this.days.length < totalDays) {
      this.addDay();
    }
    while (this.days.length > totalDays) {
      this.removeDay(this.days.length - 1);
    }
  }

  getFilteredCountries(index: number): any[] {
    const term = (this.dayCountryFilterTexts[index] || '').toLowerCase();
    if (!term) {
      return this.countries;
    }
    return this.countries.filter((c: any) =>
      String(c.name || '')
        .toLowerCase()
        .includes(term)
    );
  }

  getFilteredDayStates(index: number): any[] {
    const list = this.dayStates[index] || [];
    const term = (this.dayStateFilterTexts[index] || '').toLowerCase();
    if (!term) {
      return list;
    }
    return list.filter((s: any) =>
      String(s.name || '')
        .toLowerCase()
        .includes(term)
    );
  }

  getFilteredDayCities(index: number): any[] {
    const list = this.dayCities[index] || [];
    const term = (this.dayCityFilterTexts[index] || '').toLowerCase();
    if (!term) {
      return list;
    }
    return list.filter((c: any) =>
      String(c.name || '')
        .toLowerCase()
        .includes(term)
    );
  }

  onBannerFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.bannerFileName = file ? file.name : null;
    this.bannerFile = file;
  }

  onDayImagesChange(dayIndex: number, event: Event): void {
    if (dayIndex < 0 || dayIndex >= this.days.length) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.dayImageFiles[dayIndex] = files;
    this.dayImages[dayIndex] = files.map((f) => f.name);
  }

  getDepartureVehiclePrice(
    departFrom: string,
    vehicleId: number
  ): {
    depart_from: string;
    vehicle_id: number;
    single_adult_price: number | null;
    single_child_price: number | null;
    max_occupancy_price: number | null;
  } | null {
    return (
      this.departureVehiclePrices.find(
        (p) => p.depart_from === departFrom && p.vehicle_id === vehicleId
      ) || null
    );
  }

  onDepartureVehiclePriceChange(
    departFrom: string,
    vehicleId: number,
    field: 'single_adult_price' | 'single_child_price' | 'max_occupancy_price',
    raw: any
  ): void {
    this.syncDepartureVehiclePrices();
    const item = this.departureVehiclePrices.find(
      (p) => p.depart_from === departFrom && p.vehicle_id === vehicleId
    );
    if (!item) {
      return;
    }
    const num =
      raw === null || raw === undefined || String(raw).trim() === ''
        ? null
        : Number(raw);
    if (Number.isNaN(num as number)) {
      return;
    }
    item[field] = num;
  }

  save(): void {
    if (this.saving) {
      return;
    }
    const nightsCtrl = this.form.get('nights');
    const maxSeatsCtrl = this.form.get('maxSeats');
    const vehiclesCtrl = this.form.get('vehicles');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields', 'Close', {
        duration: 2500
      });
      return;
    }

    if (!this.departFromList.length) {
      this.snackBar.open('Depart From is required', 'Close', {
        duration: 2500
      });
      return;
    }

    const maxSeatsVal = maxSeatsCtrl?.value;
    if (!maxSeatsVal || Number(maxSeatsVal) < 1) {
      maxSeatsCtrl?.markAsTouched();
      this.snackBar.open('Max Seats is required', 'Close', {
        duration: 2500
      });
      return;
    }

    const vehiclesVal = vehiclesCtrl?.value;
    if (!Array.isArray(vehiclesVal) || !vehiclesVal.length) {
      vehiclesCtrl?.markAsTouched();
      this.snackBar.open('Select Vehicles is required', 'Close', {
        duration: 2500
      });
      return;
    }

    const nights = Number(nightsCtrl?.value || 0);
    const dayGroups = this.days.controls as FormGroup[];
    if (nights > 0 && dayGroups.length !== nights + 1) {
      this.snackBar.open('Days count must be nights + 1', 'Close', {
        duration: 2500
      });
      return;
    }

    for (let i = 0; i < dayGroups.length; i++) {
      const dayGroup = dayGroups[i];
      const title = String(dayGroup.get('title')?.value || '').trim();
      const hotels = this.daySelectedHotels[i] || [];
      const isLastDay = i === dayGroups.length - 1;
      if (!title) {
        dayGroup.get('title')?.markAsTouched();
        this.snackBar.open(`Day ${i + 1}: Title is required`, 'Close', {
          duration: 2500
        });
        return;
      }
      if (!isLastDay && !hotels.length) {
        this.snackBar.open(
          `Day ${i + 1}: At least one hotel is required`,
          'Close',
          {
            duration: 2500
          }
        );
        return;
      }
    }

    const allowInstallments = !!this.form.get('allowInstallmentPayment')?.value;
    const installmentsArr = this.installments;
    if (allowInstallments && installmentsArr && installmentsArr.length) {
      let totalPercent = 0;
      let totalDays = 0;
      for (let i = 0; i < installmentsArr.length; i++) {
        const grp = installmentsArr.at(i) as FormGroup;
        const perc = Number(grp.get('percentage')?.value || 0);
        if (!perc || perc <= 0) {
          this.snackBar.open(
            `Installment ${i + 1}: Percentage is required`,
            'Close',
            { duration: 2500 }
          );
          return;
        }
        totalPercent += perc;
        if (i > 0) {
          const daysAfter = Number(grp.get('daysAfterPrevious')?.value || 0);
          if (!daysAfter || daysAfter <= 0) {
            this.snackBar.open(
              `Installment ${i + 1}: Days after previous installment is required`,
              'Close',
              { duration: 2500 }
            );
            return;
          }
          totalDays += daysAfter;
        }
      }
      if (totalPercent !== 100) {
        this.snackBar.open(
          'Total installment percentage must be exactly 100%',
          'Close',
          { duration: 2500 }
        );
        return;
      }
      const maxScheduleDays = this.getMaxInstallmentDays();
      if (maxScheduleDays && totalDays > maxScheduleDays) {
        this.snackBar.open(
          `Total installment days cannot be greater than itinerary duration (${maxScheduleDays} days)`,
          'Close',
          { duration: 2500 }
        );
        return;
      }
    }
    const value = this.form.value;
    const days: ItineraryDay[] = (value.days || []).map(
      (d: any, index: number) => {
        const isLastDay = index === (value.days || []).length - 1;
        const hotels = isLastDay ? [] : this.daySelectedHotels[index] || [];
        const hotelIds = hotels
          .map((h) => Number(h.id || 0) || 0)
          .filter((id) => !!id);

        const defaultMealPlanByHotel: { [hotelId: number]: number | null } = {};
        const defaultRoomByHotel: { [hotelId: number]: number | null } = {};

        const hotelMealPlans = hotels
          .map((h) => {
            const hotelId = Number(h.id || 0) || 0;
            if (!hotelId) {
              return null;
            }
            const inventoryId =
              h.inventory_id != null ? Number(h.inventory_id || 0) || 0 : 0;
            let mpIds = (h.selectedMealPlanIds || [])
              .map((v) => Number(v || 0) || 0)
              .filter((v, i, arr) => v && arr.indexOf(v) === i);
            const defaultMpId =
              h.defaultMealPlanId && mpIds.includes(h.defaultMealPlanId)
                ? h.defaultMealPlanId
                : null;
            if (defaultMpId) {
              mpIds = [
                defaultMpId,
                ...mpIds.filter((id: number) => id !== defaultMpId)
              ];
            }
            if (!isLastDay && mpIds.length) {
              defaultMealPlanByHotel[hotelId] = mpIds[0];
            }

            if (!isLastDay) {
              const defaultRoomId = this.getDefaultHotelRoomId(h);
              if (defaultRoomId) {
                defaultRoomByHotel[hotelId] = defaultRoomId;
              }
            }
            if (!inventoryId || !mpIds.length) {
              return null;
            }
            return {
              hotel_id: hotelId,
              inventory_id: inventoryId,
              meal_plan_ids: mpIds
            };
          })
          .filter((row) => !!row) as any;
        let defaultHotelId = this.dayDefaultHotelIds[index] || null;
        if (!isLastDay) {
          if (
            (!defaultHotelId || !hotelIds.includes(defaultHotelId)) &&
            hotelIds.length
          ) {
            defaultHotelId = hotelIds[0];
          }
        } else {
          defaultHotelId = null;
        }
        return {
          title: d.title || '',
          description: d.description || '',
          country_id:
            d.country_id !== undefined && d.country_id !== null
              ? Number(d.country_id)
              : null,
          state_id:
            d.state_id !== undefined && d.state_id !== null
              ? Number(d.state_id)
              : null,
          city_id:
            d.city_id !== undefined && d.city_id !== null
              ? Number(d.city_id)
              : null,
          hotel_ids: hotelIds,
          default_hotel_id: defaultHotelId,

          default_meal_plan_id: defaultMealPlanByHotel,
          default_room_id: defaultRoomByHotel,
          hotel_meal_plans: hotelMealPlans,
          images: this.dayImages[index] || []
        };
      }
    );

    const vehicleIds = Array.isArray(value.vehicles)
      ? value.vehicles
          .map((v: any) => Number(v || 0) || 0)
          .filter(
            (v: number, i: number, arr: number[]) => v && arr.indexOf(v) === i
          )
      : [];

    const vehiclePrices = vehicleIds
      .map((id: number) => {
        const v = this.vehicleOptions.find((opt) => opt.id === id);
        if (!v) {
          return null;
        }
        const isDefault =
          id === this.defaultSicVehicleId || id === this.defaultPrivateVehicleId
            ? 1
            : 0;
        return {
          vehicle_id: id,
          single_adult_price: v.single_price ?? null,
          max_occupancy_price: v.max_occupancy_price ?? null,
          is_default: isDefault
        };
      })
      .filter((row: any) => !!row);

    const isRefundable = value.refundPolicyType === 'refundable';
    const refundRulesArr = isRefundable
      ? this.refundRules.controls
          .map((c: any) => {
            const days = Number(c.get('daysBeforeDeparture')?.value ?? 0);
            const pct = Number(c.get('penaltyAmount')?.value ?? 0);
            return {
              days_before_checkin: days,
              percentage: pct
            };
          })
          .filter(
            (r: any) =>
              r.days_before_checkin > 0 &&
              typeof r.percentage === 'number' &&
              r.percentage >= 0
          )
      : [];
    const allowHold = !!value.allowHoldBooking;
    const holdLimit =
      value.holdLimitHours !== null && value.holdLimitHours !== undefined
        ? Number(value.holdLimitHours)
        : null;
    const holdPercentage =
      value.holdPercentage !== null && value.holdPercentage !== undefined
        ? Number(value.holdPercentage)
        : null;
    const holdCutoffDays =
      value.holdCutoffDays !== null && value.holdCutoffDays !== undefined
        ? Number(value.holdCutoffDays)
        : null;

    const payload: any = {
      name: value.name || '',
      description: value.description || '',
      nights: Number(value.nights) || 1,
      maxSeats: value.maxSeats ? Number(value.maxSeats) : null,
      country_id:
        value.country_id !== undefined && value.country_id !== null
          ? Number(value.country_id)
          : null,
      state_id:
        value.state_id !== undefined && value.state_id !== null
          ? Number(value.state_id)
          : null,
      city_id:
        value.city_id !== undefined && value.city_id !== null
          ? Number(value.city_id)
          : null,
      travelType: value.travelType,
      fitStart: value.fitStart,
      fitEnd: value.fitEnd,
      groupDates: this.groupDates.controls.map((c) => c.value),
      days,
      depart_from: this.departFromList,
      vehicle_ids: vehicleIds,
      vehicle_prices: vehiclePrices,
      markup:
        value.markup !== null && value.markup !== undefined
          ? Number(value.markup) || 0
          : null,
      inclusions: value.inclusions || '',
      exclusions: value.exclusions || '',
      terms: value.terms || '',
      allowInstallmentPayment: !!value.allowInstallmentPayment,
      allow_hold_booking: allowHold,
      hold_booking_limit: holdLimit,
      hold_booking_percentage: holdPercentage,
      hold_booking_cutoff_days: holdCutoffDays,
      is_refundable: isRefundable,
      refund_rules: refundRulesArr
    };
    if (installmentsArr && installmentsArr.length) {
      payload.installments = installmentsArr.controls.map(
        (grp: any, index: number) => {
          const daysAfter =
            index === 0
              ? 0
              : Number(grp.get('daysAfterPrevious')?.value || 0) || 0;
          const perc = Number(grp.get('percentage')?.value || 0) || 0;
          return {
            number: index + 1,
            days_after_previous: daysAfter,
            percentage: perc
          };
        }
      );
    }
    if (this.bannerFileName) {
      payload.banner_image_name = this.bannerFileName;
    }

    const formData = new FormData();
    formData.append('name', payload.name);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    formData.append('nights', String(payload.nights));
    if (payload.maxSeats !== null && payload.maxSeats !== undefined) {
      formData.append('maxSeats', String(payload.maxSeats));
    }
    if (payload.country_id !== null && payload.country_id !== undefined) {
      formData.append('country_id', String(payload.country_id));
    }
    if (payload.state_id !== null && payload.state_id !== undefined) {
      formData.append('state_id', String(payload.state_id));
    }
    if (payload.city_id !== null && payload.city_id !== undefined) {
      formData.append('city_id', String(payload.city_id));
    }
    if (payload.travelType) {
      formData.append('travelType', String(payload.travelType));
    }
    if (payload.inclusions) {
      formData.append('inclusions', payload.inclusions);
    }
    if (payload.exclusions) {
      formData.append('exclusions', payload.exclusions);
    }
    if (payload.terms) {
      formData.append('terms', payload.terms);
    }
    const normalizeDate = (val: any): string => {
      if (!val) {
        return '';
      }
      if (val instanceof Date) {
        return val.toISOString();
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
      return String(val);
    };
    if (payload.fitStart) {
      formData.append('fitStart', normalizeDate(payload.fitStart));
    }
    if (payload.fitEnd) {
      formData.append('fitEnd', normalizeDate(payload.fitEnd));
    }
    if (Array.isArray(payload.groupDates)) {
      payload.groupDates.forEach((gd: any, idx: number) => {
        const v = normalizeDate(gd);
        if (v) {
          formData.append(`groupDates[${idx}]`, v);
        }
      });
    }
    if (Array.isArray(payload.depart_from)) {
      payload.depart_from.forEach((city: string, idx: number) => {
        if (city) {
          formData.append(`depart_from[${idx}]`, city);
        }
      });
    }
    if (Array.isArray(payload.vehicle_ids)) {
      payload.vehicle_ids.forEach((vid: number, idx: number) => {
        formData.append(`vehicle_ids[${idx}]`, String(vid));
      });
    }
    if (Array.isArray(payload.vehicle_prices)) {
      payload.vehicle_prices.forEach((vp: any, idx: number) => {
        formData.append(
          `vehicle_prices[${idx}][vehicle_id]`,
          String(vp.vehicle_id)
        );
        if (vp.is_default !== null && vp.is_default !== undefined) {
          formData.append(
            `vehicle_prices[${idx}][is_default]`,
            String(vp.is_default)
          );
        }
        if (
          vp.single_adult_price !== null &&
          vp.single_adult_price !== undefined
        ) {
          formData.append(
            `vehicle_prices[${idx}][single_adult_price]`,
            String(vp.single_adult_price)
          );
        }
        if (
          vp.max_occupancy_price !== null &&
          vp.max_occupancy_price !== undefined
        ) {
          formData.append(
            `vehicle_prices[${idx}][max_occupancy_price]`,
            String(vp.max_occupancy_price)
          );
        }
      });
    }
    if (Array.isArray(this.departureVehiclePrices)) {
      this.departureVehiclePrices.forEach((dp, idx) => {
        if (dp.depart_from) {
          formData.append(
            `departure_vehicle_prices[${idx}][depart_from]`,
            dp.depart_from
          );
        }
        formData.append(
          `departure_vehicle_prices[${idx}][vehicle_id]`,
          String(dp.vehicle_id)
        );
        if (
          dp.single_adult_price !== null &&
          dp.single_adult_price !== undefined
        ) {
          formData.append(
            `departure_vehicle_prices[${idx}][single_adult_price]`,
            String(dp.single_adult_price)
          );
        }
        if (
          dp.single_child_price !== null &&
          dp.single_child_price !== undefined
        ) {
          formData.append(
            `departure_vehicle_prices[${idx}][single_child_price]`,
            String(dp.single_child_price)
          );
        }
        if (
          dp.max_occupancy_price !== null &&
          dp.max_occupancy_price !== undefined
        ) {
          formData.append(
            `departure_vehicle_prices[${idx}][max_occupancy_price]`,
            String(dp.max_occupancy_price)
          );
        }
      });
    }
    if (Array.isArray(payload.installments)) {
      payload.installments.forEach((ins: any, idx: number) => {
        formData.append(`installments[${idx}][number]`, String(ins.number));
        formData.append(
          `installments[${idx}][days_after_previous]`,
          String(ins.days_after_previous)
        );
        formData.append(
          `installments[${idx}][percentage]`,
          String(ins.percentage)
        );
      });
    }
    formData.append(
      'allowInstallmentPayment',
      payload.allowInstallmentPayment ? '1' : '0'
    );
    formData.append(
      'allow_hold_booking',
      payload.allow_hold_booking ? '1' : '0'
    );
    if (
      payload.hold_booking_limit !== null &&
      payload.hold_booking_limit !== undefined
    ) {
      formData.append('hold_booking_limit', String(payload.hold_booking_limit));
    }
    if (
      payload.hold_booking_percentage !== null &&
      payload.hold_booking_percentage !== undefined
    ) {
      formData.append(
        'hold_booking_percentage',
        String(payload.hold_booking_percentage)
      );
    }
    if (
      payload.hold_booking_cutoff_days !== null &&
      payload.hold_booking_cutoff_days !== undefined
    ) {
      formData.append(
        'hold_booking_cutoff_days',
        String(payload.hold_booking_cutoff_days)
      );
    }
    formData.append('is_refundable', payload.is_refundable ? '1' : '0');
    if (Array.isArray(payload.refund_rules)) {
      payload.refund_rules.forEach((rr: any, idx: number) => {
        formData.append(
          `refund_rules[${idx}][days_before_checkin]`,
          String(rr.days_before_checkin)
        );
        formData.append(
          `refund_rules[${idx}][percentage]`,
          String(rr.percentage)
        );
      });
    }
    if (payload.markup !== null && payload.markup !== undefined) {
      formData.append('markup', String(payload.markup));
    }
    if (this.bannerFile) {
      formData.append('banner_image', this.bannerFile);
    }
    if (payload.banner_image_name) {
      formData.append('banner_image_name', payload.banner_image_name);
    }
    if (Array.isArray(payload.days)) {
      payload.days.forEach((d: any, dayIndex: number) => {
        formData.append(`days[${dayIndex}][title]`, d.title || '');
        formData.append(`days[${dayIndex}][description]`, d.description || '');
        if (d.country_id !== null && d.country_id !== undefined) {
          formData.append(
            `days[${dayIndex}][country_id]`,
            String(d.country_id)
          );
        }
        if (d.state_id !== null && d.state_id !== undefined) {
          formData.append(`days[${dayIndex}][state_id]`, String(d.state_id));
        }
        if (d.city_id !== null && d.city_id !== undefined) {
          formData.append(`days[${dayIndex}][city_id]`, String(d.city_id));
        }
        if (Array.isArray(d.hotel_ids)) {
          d.hotel_ids.forEach((hid: number, hIdx: number) => {
            formData.append(
              `days[${dayIndex}][hotel_ids][${hIdx}]`,
              String(hid)
            );
          });
        }
        if (d.default_hotel_id !== null && d.default_hotel_id !== undefined) {
          formData.append(
            `days[${dayIndex}][default_hotel_id]`,
            String(d.default_hotel_id)
          );
        }
        if (
          d.default_meal_plan_id &&
          typeof d.default_meal_plan_id === 'object'
        ) {
          Object.keys(d.default_meal_plan_id).forEach((hid: any) => {
            const mpId = (d.default_meal_plan_id as any)[hid];
            if (mpId !== null && mpId !== undefined) {
              formData.append(
                `days[${dayIndex}][default_meal_plan_id][${hid}]`,
                String(mpId)
              );
            }
          });
        }
        if (d.default_room_id && typeof d.default_room_id === 'object') {
          Object.keys(d.default_room_id).forEach((hid: any) => {
            const roomId = (d.default_room_id as any)[hid];
            if (roomId !== null && roomId !== undefined) {
              formData.append(
                `days[${dayIndex}][default_room_id][${hid}]`,
                String(roomId)
              );
            }
          });
        }
        if (Array.isArray(d.hotel_meal_plans)) {
          d.hotel_meal_plans.forEach((mp: any, mpIdx: number) => {
            formData.append(
              `days[${dayIndex}][hotel_meal_plans][${mpIdx}][hotel_id]`,
              String(mp.hotel_id)
            );
            if (mp.inventory_id !== null && mp.inventory_id !== undefined) {
              formData.append(
                `days[${dayIndex}][hotel_meal_plans][${mpIdx}][inventory_id]`,
                String(mp.inventory_id)
              );
            }
            if (Array.isArray(mp.meal_plan_ids)) {
              mp.meal_plan_ids.forEach((mpId: number, mpi: number) => {
                formData.append(
                  `days[${dayIndex}][hotel_meal_plans][${mpIdx}][meal_plan_ids][${mpi}]`,
                  String(mpId)
                );
              });
            }
          });
        }
        if (Array.isArray(d.images)) {
          d.images.forEach((img: string, imgIdx: number) => {
            formData.append(`days[${dayIndex}][images][${imgIdx}]`, img);
          });
        }
        const fileImages = this.dayImageFiles[dayIndex] || [];
        fileImages.forEach((file) => {
          formData.append(`days[${dayIndex}][images][]`, file);
        });
      });
    }

    this.saving = true;
    let req$;
    if (this.isEdit && this.itineraryId) {
      for (const [key, value] of (formData as any).entries()) {
        console.log('FormData:', key, value);
      }
      req$ = this.http.post<any>(
        `${this.apiUrl}/itineraries/${this.itineraryId}`,
        formData
      );
    } else {
      req$ = this.http.post<any>(`${this.apiUrl}/saveitnery`, formData);
    }

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(
          this.isEdit ? 'Itinerary updated' : 'Itinerary saved',
          'Close',
          {
            duration: 2000
          }
        );
        this.router.navigate(['/sale/itinerary-builder']);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open(
          this.isEdit
            ? 'Failed to update itinerary'
            : 'Failed to save itinerary',
          'Close',
          {
            duration: 2500
          }
        );
      }
    });
  }
}
