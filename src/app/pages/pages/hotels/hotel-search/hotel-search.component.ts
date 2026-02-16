import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  map
} from 'rxjs';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { MatDialog } from '@angular/material/dialog';
import { HotelSearchBarComponent } from '../hotel-search-bar/hotel-search-bar.component';
import { environment } from '../../../../../environments/environment';

const HOTEL_DATE_FORMATS = {
  parse: {
    dateInput: 'dd/MM/yyyy'
  },
  display: {
    dateInput: 'dd MMM yy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

@Component({
  selector: 'vex-hotel-search',
  standalone: true,
  templateUrl: './hotel-search.component.html',
  styleUrls: ['./hotel-search.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCheckboxModule,
    MatRadioModule,
    MatIconModule,
    MatAutocompleteModule,
    MatCardModule,
    MatProgressBarModule,
    MatDialogModule,
    RouterModule,
    HotelSearchBarComponent,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: HOTEL_DATE_FORMATS }]
})
export class HotelSearchComponent {
  form: FormGroup;
  currentYear = new Date().getFullYear();
  lastSearchLabel = '';
  searchType: 'normal' | 'confirm' = 'normal';
  imgBaseUrl: string = environment.imgUrl;

  locationCtrl = new FormControl('');
  modeCtrl!: FormControl;
  filteredOptions$: Observable<any[]> = of([]);
  @ViewChild('roomsGuestsTpl') roomsGuestsTpl!: TemplateRef<any>;
  roomsConfig: {
    adults: number;
    children: number;
    childAges: number[];
    extraBedFlags: boolean[];
  }[] = [{ adults: 2, children: 0, childAges: [], extraBedFlags: [] }];
  childAgeOptions: number[] = Array.from({ length: 18 }, (_, i) => i);
  minCheckIn: Date = this.today();
  minCheckOut: Date = this.addDays(this.today(), 1);
  results: Array<any> = [];
  loading = false;
  errorMsg = '';
  confirmDateRanges: Array<{ start_date: string; end_date: string }> = [];
  confirmAvailabilityLoading = false;
  confirmAvailabilityError = '';
  confirmAvailableDates: Array<{ date: string; total: number }> = [];
  selectedHotelId: number | null = null;
  selectedInventoryId: number | null = null;
  locationSearchType: 'city' | 'hotel' | null = null;

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
    private fb: FormBuilder,
    private hotelService: HotelService,
    private router: Router,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      mode: ['upto4', Validators.required],
      location: [''],
      checkIn: [null, Validators.required],
      checkOut: [null, Validators.required],
      rooms: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
      adults: [2, [Validators.required, Validators.min(1), Validators.max(12)]],
      children: [
        0,
        [Validators.required, Validators.min(0), Validators.max(12)]
      ],
      intent: [''],
      freeCancellation: [false],
      freeBreakfast: [false],
      petFriendly: [false]
    });

    this.modeCtrl = this.form.get('mode') as FormControl;

    this.filteredOptions$ = this.locationCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const query = String(q || '').trim();
        if (!query) return of([]);
        const hotels$ = this.hotelService
          .searchHotelsAutocomplete(
            query,
            6,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            this.searchType
          )
          .pipe(
            map((res: any) => {
              const rows = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res)
                  ? res
                  : [];
              const hotelItems = rows.map((h: any) => {
                const name = h.name || h.hotel_name || '';
                const city = h.city_name || '';
                return {
                  type: 'hotel',
                  id: h.id,
                  label: [name, city].filter(Boolean).join(' — ')
                };
              });
              const cityMap: {
                [id: string]: { type: string; id: number; label: string };
              } = {};
              rows.forEach((h: any) => {
                const cid = String(h.city || '');
                const cname = String(h.city_name || '');
                if (cid && cname && !cityMap[cid]) {
                  cityMap[cid] = {
                    type: 'city',
                    id: Number(cid),
                    label: cname
                  };
                }
              });
              const cityItems = Object.values(cityMap);
              return [
                { label: 'Cities', items: cityItems },
                { label: 'Hotels', items: hotelItems }
              ];
            })
          );
        return hotels$;
      })
    );
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const typeParam = String(params['type'] || '').toLowerCase();
      if (typeParam === 'confirm' || typeParam === 'normal') {
        this.searchType = typeParam as any;
      }
      const invIdParam = params['inventory_id']
        ? Number(params['inventory_id'])
        : null;
      if (invIdParam && invIdParam > 0) {
        this.selectedInventoryId = invIdParam;
      }
      const ci = String(params['checkIn'] || '');
      const co = String(params['checkOut'] || '');
      const loc = String(params['location'] || '');
      const rooms = params['rooms'] ? Number(params['rooms']) : null;
      const adults = params['adults'] ? Number(params['adults']) : null;
      const children = params['children'] ? Number(params['children']) : null;
      if (ci) {
        const d = this.parseDate(ci);
        if (d) {
          this.form.patchValue({ checkIn: d });
          this.onCheckInChange(d);
        }
      }
      if (co) {
        const d = this.parseDate(co);
        if (d) {
          this.form.patchValue({ checkOut: d });
        }
      }
      if (loc) {
        this.locationCtrl.setValue(loc, { emitEvent: false });
        this.form.patchValue({ location: loc });
      }
      if (rooms && rooms > 0) this.form.patchValue({ rooms });
      if (adults && adults > 0) this.form.patchValue({ adults });
      if (children !== null && children >= 0) {
        this.form.patchValue({ children });
        const childAgesParam = String(
          (params['childAges'] ?? params['child_ages'] ?? '').toString()
        );
        const extraBedFlagsParam = String(
          (
            params['extraBedFlags'] ??
            params['extra_bed_flags'] ??
            ''
          ).toString()
        );
        let parsedAges: number[] = [];
        if (childAgesParam) {
          parsedAges = childAgesParam
            .split(',')
            .map((x) => Number(x))
            .filter((n) => !isNaN(n as any));
        }
        let parsedExtraFlags: boolean[] = [];
        if (extraBedFlagsParam) {
          parsedExtraFlags = extraBedFlagsParam.split(',').map((x) => {
            const n = Number(x);
            return !isNaN(n as any) && n > 0;
          });
        }
        const c = Math.min(Number(children), 4);
        while (parsedAges.length < c) parsedAges.push(5);
        if (parsedAges.length > c) parsedAges = parsedAges.slice(0, c);
        if (this.roomsConfig.length === 0) {
          this.roomsConfig = [
            { adults: 2, children: 0, childAges: [], extraBedFlags: [] }
          ];
        }
        this.roomsConfig[0].children = c;
        this.roomsConfig[0].childAges = parsedAges;
        const flags: boolean[] = [];
        for (let i = 0; i < c; i++) {
          flags.push(parsedExtraFlags[i] === true);
        }
        this.roomsConfig[0].extraBedFlags = flags;
      }
      const v = this.form.value;
      if (v.checkIn && v.checkOut) {
        this.search();
      }
    });
  }

  onSelectLocation(option: any) {
    if (!option) return;
    if (option.type === 'hotel' && option.id) {
      this.selectedHotelId = Number(option.id);
      this.locationSearchType = 'hotel';
      this.hotelService.getHotelById(Number(option.id)).subscribe({
        next: (res: any) => {
          const name = res?.hotel?.name || option.label || '';
          const city = res?.hotel?.city_name || '';
          const display = [name, city].filter(Boolean).join(', ');
          this.locationCtrl.setValue(display, { emitEvent: false });
          this.form.patchValue({ location: display });
          if (this.searchType === 'confirm') {
            this.loadConfirmAvailabilityForHotel(Number(option.id));
          } else {
            this.loadNormalInventoryForHotel(Number(option.id));
          }
        },
        error: () => {
          const display = option.label || '';
          this.locationCtrl.setValue(display, { emitEvent: false });
          this.form.patchValue({ location: display });
          if (this.searchType === 'confirm') {
            this.loadConfirmAvailabilityForHotel(Number(option.id));
          } else {
            this.loadNormalInventoryForHotel(Number(option.id));
          }
        }
      });
      return;
    }
    const display = option.label || '';
    this.locationCtrl.setValue(display, { emitEvent: false });
    this.form.patchValue({ location: display });
    this.selectedHotelId = null;
    this.selectedInventoryId = null;
    this.locationSearchType = option.type === 'city' ? 'city' : null;
  }

  get petFriendlyCtrl(): FormControl {
    return this.form.get('petFriendly') as FormControl;
  }

  today(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  addDays(d: Date, days: number): Date {
    const nd = new Date(d);
    nd.setDate(d.getDate() + days);
    nd.setHours(0, 0, 0, 0);
    return nd;
  }

  onCheckInChange(date: Date | null) {
    if (!date) return;
    const nextDay = this.addDays(date, 1);
    this.minCheckOut = nextDay;
    const currentOut = this.form.get('checkOut')?.value as Date | null;
    if (currentOut && currentOut < nextDay) {
      this.form.patchValue({ checkOut: null });
    }
  }

  get roomsGuestsLabel(): string {
    const rooms = this.roomsConfig.length;
    const adults = this.roomsConfig.reduce((s, r) => s + r.adults, 0);
    const children = this.roomsConfig.reduce((s, r) => s + r.children, 0);
    const parts = [`${rooms} Rooms`, `${adults} Adults`];
    if (children > 0) parts.push(`${children} Children`);
    return parts.join(' • ');
  }

  openRoomsGuestsDialog() {
    this.dialog.open(this.roomsGuestsTpl, {
      width: '640px'
    });
  }

  onCancelRoomsGuests() {
    this.dialog.closeAll();
  }

  incrementRooms() {
    if (this.roomsConfig.length >= 4) return;
    this.roomsConfig.push({
      adults: 2,
      children: 0,
      childAges: [],
      extraBedFlags: []
    });
  }

  decrementRooms() {
    if (this.roomsConfig.length <= 1) return;
    this.roomsConfig.pop();
  }

  incrementAdults(i: number) {
    const room = this.roomsConfig[i];
    if (!room) return;
    if (room.adults >= 20) return;
    room.adults += 1;
  }

  decrementAdults(i: number) {
    const room = this.roomsConfig[i];
    if (!room) return;
    if (room.adults <= 1) return;
    room.adults -= 1;
  }

  incrementChildren(i: number) {
    const room = this.roomsConfig[i];
    if (!room) return;
    if (room.children >= 4) return;
    room.children += 1;
    room.childAges.push(5);
    room.extraBedFlags.push(false);
  }

  decrementChildren(i: number) {
    const room = this.roomsConfig[i];
    if (!room) return;
    if (room.children <= 0) return;
    room.children -= 1;
    room.childAges.pop();
    room.extraBedFlags.pop();
  }

  setChildAge(roomIndex: number, childIndex: number, age: number) {
    const room = this.roomsConfig[roomIndex];
    if (!room) return;
    room.childAges[childIndex] = age;
  }

  toggleExtraBed(roomIndex: number, childIndex: number, checked: boolean) {
    const room = this.roomsConfig[roomIndex];
    if (!room) return;
    if (!room.extraBedFlags || room.extraBedFlags.length !== room.children) {
      room.extraBedFlags = Array.from({ length: room.children }, () => false);
    }
    room.extraBedFlags[childIndex] = checked;
  }

  applyRoomsGuests() {
    const rooms = this.roomsConfig.length;
    const adults = this.roomsConfig.reduce((s, r) => s + r.adults, 0);
    const children = this.roomsConfig.reduce((s, r) => s + r.children, 0);
    this.form.patchValue({
      rooms,
      adults,
      children
    });
    this.dialog.closeAll();
  }

  openHotelDetail(h: any) {
    const v = this.form.value;
    const from = v.checkIn ? this.formatDate(v.checkIn) : '';
    const to = v.checkOut ? this.formatDate(v.checkOut) : '';
    const childAgesCombined: number[] = this.roomsConfig
      .reduce((acc: number[], r) => acc.concat(r.childAges || []), [])
      .filter((x) => typeof x === 'number' && !isNaN(x));
    const extraBedFlagsCombined: number[] = [];
    this.roomsConfig.forEach((r) => {
      for (let j = 0; j < r.children; j++) {
        const f =
          Array.isArray(r.extraBedFlags) &&
          j < r.extraBedFlags.length &&
          r.extraBedFlags[j];
        extraBedFlagsCombined.push(f ? 1 : 0);
      }
    });
    const invId = Number(h?.inventory_id || this.selectedInventoryId || 0);
    this.router.navigate(['/hotels/detail'], {
      queryParams: {
        from,
        to,
        rooms: v.rooms,
        adults: v.adults,
        children: v.children,
        childAges:
          v.children > 0 && childAgesCombined.length
            ? childAgesCombined.join(',')
            : null,
        extraBedFlags:
          v.children > 0 && extraBedFlagsCombined.length
            ? extraBedFlagsCombined.join(',')
            : null,
        inventory_id: invId || null,
        type: this.searchType || null
      }
    });
  }

  search() {
    if (this.form.invalid) return;
    const totalChildren = this.roomsConfig.reduce((s, r) => s + r.children, 0);
    const allAgesSelected = this.roomsConfig.every(
      (r) =>
        r.childAges.length === r.children &&
        r.childAges.every((a) => typeof a === 'number' && !isNaN(a as any))
    );
    if (totalChildren > 0 && !allAgesSelected) {
      this.errorMsg = 'Please select age for every child';
      return;
    }
    const v = this.form.value;
    const from = v.checkIn ? this.formatDate(v.checkIn) : '';
    const to = v.checkOut ? this.formatDate(v.checkOut) : '';
    let locationSearchType: 'city' | 'hotel' | null = this.locationSearchType;
    if (!locationSearchType) {
      locationSearchType = this.selectedHotelId ? 'hotel' : 'city';
    }
    const childAgesCombined: number[] = this.roomsConfig
      .reduce((acc: number[], r) => acc.concat(r.childAges || []), [])
      .filter((x) => typeof x === 'number' && !isNaN(x));
    const extraBedFlagsCombined: number[] = [];
    this.roomsConfig.forEach((r) => {
      for (let j = 0; j < r.children; j++) {
        const f =
          Array.isArray(r.extraBedFlags) &&
          j < r.extraBedFlags.length &&
          r.extraBedFlags[j];
        extraBedFlagsCombined.push(f ? 1 : 0);
      }
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        checkIn: from || null,
        checkOut: to || null,
        location: v.location || null,
        rooms: v.rooms || null,
        adults: v.adults || null,
        children: v.children || null,
        childAges:
          v.children > 0 && childAgesCombined.length
            ? childAgesCombined.join(',')
            : null,
        extraBedFlags:
          v.children > 0 && extraBedFlagsCombined.length
            ? extraBedFlagsCombined.join(',')
            : null,
        type: this.searchType || null,
        searchtype: locationSearchType,
        inventory_id: this.selectedInventoryId || null
      },
      queryParamsHandling: 'merge'
    });
    this.lastSearchLabel = [
      v.location || 'Any',
      from,
      to,
      `${v.rooms} Rooms`,
      `${v.adults} Adults`,
      v.children > 0 ? `${v.children} Children` : ''
    ]
      .filter(Boolean)
      .join(', ');
    this.loading = true;
    this.errorMsg = '';
    this.results = [];
    this.hotelService
      .searchAvailability({
        q: v.location || '',
        from,
        to,
        rooms: v.rooms,
        adults: v.adults,
        children: v.children,
        childAges: childAgesCombined.length ? childAgesCombined : undefined,
        extraBedFlags: extraBedFlagsCombined.length
          ? extraBedFlagsCombined
          : undefined,
        petFriendly: !!v.petFriendly,
        type: this.searchType,
        searchtype: locationSearchType || undefined,
        inventory_id: this.selectedInventoryId || undefined
      })
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.results = rows;
          this.loading = false;
        },
        error: () => {
          this.errorMsg = 'Failed to search hotels';
          this.loading = false;
        }
      });
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseDate(s: string): Date | null {
    const parts = s.split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  loadConfirmAvailabilityForHotel(hotelId: number) {
    this.confirmAvailabilityLoading = true;
    this.confirmAvailabilityError = '';
    this.confirmDateRanges = [];
    this.confirmAvailableDates = [];
    this.hotelService.getHotelInventories('confirm').subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const match = rows.find(
          (r: any) => Number(r.hotel_id) === Number(hotelId)
        );
        if (!match) {
          this.confirmAvailabilityError =
            'No confirm inventory found for selected hotel';
          this.confirmAvailabilityLoading = false;
          return;
        }
        const invId = Number(match.inventory_id || match.id);
        if (!invId) {
          this.confirmAvailabilityError = 'Invalid inventory data';
          this.confirmAvailabilityLoading = false;
          return;
        }
        this.selectedInventoryId = invId;
        this.hotelService.getInventoryDates(invId).subscribe({
          next: (datesRes: any) => {
            const roomsData = Array.isArray(datesRes?.data)
              ? datesRes.data
              : Array.isArray(datesRes)
                ? datesRes
                : [];
            this.confirmDateRanges =
              this.groupInventoryDatesIntoRanges(roomsData);
            this.confirmAvailableDates = this.buildAvailableDates(roomsData);
            this.confirmAvailabilityLoading = false;
          },
          error: () => {
            this.confirmAvailabilityError =
              'Failed to load confirm availability dates';
            this.confirmAvailabilityLoading = false;
          }
        });
      },
      error: () => {
        this.confirmAvailabilityError = 'Failed to load inventories';
        this.confirmAvailabilityLoading = false;
      }
    });
  }

  loadNormalInventoryForHotel(hotelId: number) {
    this.confirmAvailabilityLoading = true;
    this.confirmAvailabilityError = '';
    this.confirmDateRanges = [];
    this.confirmAvailableDates = [];
    this.selectedInventoryId = null;
    this.hotelService.getHotelInventories('normal').subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const match = rows.find(
          (r: any) => Number(r.hotel_id) === Number(hotelId)
        );
        if (!match) {
          this.confirmAvailabilityError =
            'No inventory found for selected hotel';
          this.confirmAvailabilityLoading = false;
          return;
        }
        const invId = Number(match.inventory_id || match.id);
        if (!invId) {
          this.confirmAvailabilityError = 'Invalid inventory data';
          this.confirmAvailabilityLoading = false;
          return;
        }
        this.selectedInventoryId = invId;
        this.hotelService.getInventoryDates(invId).subscribe({
          next: (datesRes: any) => {
            const roomsData = Array.isArray(datesRes?.data)
              ? datesRes.data
              : Array.isArray(datesRes)
                ? datesRes
                : [];
            this.confirmDateRanges =
              this.groupInventoryDatesIntoRanges(roomsData);
            this.confirmAvailableDates = this.buildAvailableDates(roomsData);
            this.confirmAvailabilityLoading = false;
          },
          error: () => {
            this.confirmAvailabilityError = 'Failed to load availability dates';
            this.confirmAvailabilityLoading = false;
          }
        });
      },
      error: () => {
        this.confirmAvailabilityError = 'Failed to load inventories';
        this.confirmAvailabilityLoading = false;
      }
    });
  }

  groupInventoryDatesIntoRanges(
    roomsData: Array<{
      room_id: number;
      dates: Array<{ date: string; no_of_room: number }>;
    }>
  ): Array<{ start_date: string; end_date: string }> {
    const countMap: Record<string, number> = {};
    roomsData.forEach((room: any) => {
      const dates: Array<{ date: string; no_of_room: number }> =
        room?.dates || [];
      dates.forEach((dt) => {
        const key = String(dt.date);
        const cnt = Number(dt.no_of_room || 0);
        countMap[key] = (countMap[key] || 0) + cnt;
      });
    });
    const availableDates = Object.keys(countMap)
      .filter((k) => countMap[k] > 0)
      .sort();
    const ranges: Array<{ start_date: string; end_date: string }> = [];
    let start: string | null = null;
    let prev: string | null = null;
    for (const cur of availableDates) {
      if (start === null) {
        start = cur;
        prev = cur;
        continue;
      }
      const prevDateObj = this.parseDate(prev as string);
      if (!prevDateObj) {
        ranges.push({ start_date: start, end_date: prev as string });
        start = cur;
        prev = cur;
        continue;
      }
      const nextDay = this.addDays(prevDateObj, 1);
      const expected = this.formatDate(nextDay);
      if (expected === cur) {
        prev = cur;
      } else {
        ranges.push({ start_date: start, end_date: prev as string });
        start = cur;
        prev = cur;
      }
    }
    if (start !== null) {
      ranges.push({ start_date: start, end_date: prev as string });
    }
    return ranges;
  }

  buildAvailableDates(
    roomsData: Array<{
      room_id: number;
      dates: Array<{ date: string; no_of_room: number }>;
    }>
  ): Array<{ date: string; total: number }> {
    const countMap: Record<string, number> = {};
    roomsData.forEach((room: any) => {
      const dates: Array<{ date: string; no_of_room: number }> =
        room?.dates || [];
      dates.forEach((dt) => {
        const key = String(dt.date);
        const cnt = Number(dt.no_of_room || 0);
        countMap[key] = (countMap[key] || 0) + cnt;
      });
    });
    return Object.keys(countMap)
      .filter((d) => countMap[d] > 0)
      .sort()
      .map((d) => ({ date: d, total: countMap[d] }));
  }
}
