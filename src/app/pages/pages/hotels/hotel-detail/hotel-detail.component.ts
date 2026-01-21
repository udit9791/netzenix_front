import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl
} from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  map
} from 'rxjs';
import { HotelSearchBarComponent } from '../hotel-search-bar/hotel-search-bar.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'vex-hotel-detail',
  standalone: true,
  templateUrl: './hotel-detail.component.html',
  styleUrls: ['./hotel-detail.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatDialogModule,
    HotelSearchBarComponent,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class HotelDetailComponent {
  params: any = {};
  loading = true;
  error = '';
  inventory: any = null;
  pricing: any = null;
  quote: any = null;
  photoUrl: string | null = null;
  hotelAmenities: string[] = [];
  imgBaseUrl: string = environment.imgUrl;
  isRefundable: number | null = null;
  hotelPhotos: any[] = [];
  hotelPhotoCount = 0;
  primaryHotelPhotoUrl: string | null = null;
  hotelLatitude: number | null = null;
  hotelLongitude: number | null = null;
  confirmAvailabilityLoading = false;
  confirmAvailabilityError = '';
  confirmAvailableDates: Array<{ date: string; total: number }> = [];
  form!: FormGroup;
  locationCtrl = new FormControl('');
  filteredOptions$: Observable<any[]> = of([]);
  @ViewChild('roomsGuestsTpl') roomsGuestsTpl!: TemplateRef<any>;
  @ViewChild('roomPhotosTpl') roomPhotosTpl!: TemplateRef<any>;
  @ViewChild('hotelPhotosTpl') hotelPhotosTpl!: TemplateRef<any>;
  roomsConfig: { adults: number; children: number; childAges: number[] }[] = [
    { adults: 2, children: 0, childAges: [] }
  ];
  childAgeOptions: number[] = Array.from({ length: 18 }, (_, i) => i);
  minCheckIn: Date = this.today();
  minCheckOut: Date = this.addDays(this.today(), 1);
  searchType: 'normal' | 'confirm' = 'normal';
  selectedHotelId: number | null = null;
  selectedInventoryId: number | null = null;
  activeRoomPhotos: string[] = [];
  activeRoomPhotoIndex = 0;
  activeHotelCategoryIndex = 0;
  activeHotelPhotoIndex = 0;
  activeRoomMeta: any = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      location: [''],
      checkIn: [null, Validators.required],
      checkOut: [null, Validators.required],
      rooms: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
      adults: [2, [Validators.required, Validators.min(1), Validators.max(12)]],
      children: [
        0,
        [Validators.required, Validators.min(0), Validators.max(12)]
      ],
      intent: ['']
    });
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
              return rows.map((h: any) => ({
                type: 'hotel',
                id: h.id,
                label: h.name || h.hotel_name || ''
              }));
            })
          );
        return hotels$.pipe(
          map((hotels) => [{ label: 'Hotels', items: hotels }])
        );
      })
    );
    this.route.queryParams.subscribe((p) => {
      const from = String(p['from'] || p['checkIn'] || '');
      const to = String(p['to'] || p['checkOut'] || '');
      const rooms = p['rooms'] ? Number(p['rooms']) : 1;
      const adults = p['adults'] ? Number(p['adults']) : 2;
      const children = p['children'] ? Number(p['children']) : 0;
      const inventory_id = p['inventory_id'] ? Number(p['inventory_id']) : 0;
      const type = String(p['type'] || 'normal');
      const agesStr = String(
        (p['childAges'] ?? p['child_ages'] ?? '').toString()
      );
      const childAges = agesStr
        ? agesStr
            .split(',')
            .map((x) => Number(x))
            .filter((n) => !isNaN(n))
        : [];
      this.params = {
        from,
        to,
        rooms,
        adults,
        children,
        inventory_id,
        type,
        childAges
      };
      this.searchType = type === 'confirm' ? 'confirm' : 'normal';
      this.selectedInventoryId = inventory_id || null;
      if (from) {
        const d = this.parseDate(from);
        if (d) {
          this.form.patchValue({ checkIn: d });
          this.onCheckInChange(d);
        }
      }
      if (to) {
        const d = this.parseDate(to);
        if (d) {
          this.form.patchValue({ checkOut: d });
        }
      }
      const safeRooms = rooms && rooms > 0 ? Math.min(rooms, 4) : 1;
      const totalAdults = adults && adults > 0 ? adults : 1;
      const totalChildren = children !== null && children >= 0 ? children : 0;
      this.form.patchValue({
        rooms: safeRooms,
        adults: totalAdults,
        children: totalChildren
      });
      this.roomsConfig = [];
      const baseAdultsPerRoom = Math.floor(totalAdults / safeRooms);
      let extraAdults = totalAdults % safeRooms;
      const baseChildrenPerRoom = Math.floor(totalChildren / safeRooms);
      let extraChildren = totalChildren % safeRooms;
      let ageIndex = 0;
      for (let i = 0; i < safeRooms; i++) {
        const roomAdults = baseAdultsPerRoom + (extraAdults > 0 ? 1 : 0);
        if (extraAdults > 0) extraAdults -= 1;
        const roomChildren = baseChildrenPerRoom + (extraChildren > 0 ? 1 : 0);
        if (extraChildren > 0) extraChildren -= 1;
        const ages: number[] = [];
        for (let j = 0; j < roomChildren; j++) {
          const age =
            childAges[ageIndex] && !isNaN(childAges[ageIndex])
              ? childAges[ageIndex]
              : 5;
          ages.push(age);
          ageIndex += 1;
        }
        this.roomsConfig.push({
          adults: roomAdults,
          children: roomChildren,
          childAges: ages
        });
      }
      this.loadData();
    });
  }

  loadData() {
    this.loading = true;
    this.error = '';
    const invId = Number(this.params.inventory_id || 0);
    if (!invId) {
      this.error = 'Missing inventory';
      this.loading = false;
      return;
    }
    this.hotelService.getHotelInventoryById(invId).subscribe({
      next: (res: any) => {
        this.inventory = res?.data?.inventory || res?.inventory || res || null;
        this.photoUrl = '/storage/hotel/default.jpg';
        const hotelName =
          this.inventory?.hotel_name || this.inventory?.name || '';
        if (hotelName) {
          this.locationCtrl.setValue(hotelName, { emitEvent: false });
          this.form.patchValue({ location: hotelName });
        }
        this.loadConfirmDates(invId);
      },
      error: () => {}
    });
    this.hotelService
      .detailAvailability({
        from: this.params.from,
        to: this.params.to,
        rooms: this.params.rooms,
        adults: this.params.adults,
        children: this.params.children,
        childAges: this.params.childAges,
        type: this.params.type,
        inventory_id: invId
      })
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || null;
          let rooms = Array.isArray(data?.rooms_data) ? data.rooms_data : [];
          console.log('Response rooms_data:', data?.rooms_data);
          rooms = rooms.map((r: any) => {
            const hasOptions =
              Array.isArray(r?.options) && r.options.length > 0;
            if (hasOptions) {
              const reqRooms = Number(this.params.rooms || data?.rooms || 1);
              const opts = r.options.map((opt: any) => {
                const ru = Number(opt?.rooms_used || 0);
                const tp = Number(opt?.total_price || 0);
                const available = ru >= reqRooms && tp > 0;
                const included = {
                  adults: Number(data?.adults ?? this.params.adults ?? 0),
                  children_paying: Number(
                    data?.children ?? this.params.children ?? 0
                  ),
                  children_free: 0
                };
                return { ...opt, available, included };
              });
              return { ...r, options: opts };
            }
            return { ...r, options: [] };
          });
          this.pricing = { rooms };
          this.isRefundable =
            data &&
            typeof data.is_refundable !== 'undefined' &&
            data.is_refundable !== null
              ? Number(data.is_refundable)
              : null;
          this.hotelPhotos = Array.isArray(data?.hotel_photos)
            ? data.hotel_photos
            : [];
          const allHotelPhotoUrls: string[] = [];
          let primaryHotelPhotoUrl: string | null = null;
          this.hotelPhotos.forEach((cat: any) => {
            const photos = Array.isArray(cat?.photos) ? cat.photos : [];
            photos.forEach((p: any) => {
              if (p && p.url) {
                allHotelPhotoUrls.push(p.url);
                if (!primaryHotelPhotoUrl && p.is_primary) {
                  primaryHotelPhotoUrl = p.url;
                }
              }
            });
          });
          if (!primaryHotelPhotoUrl && allHotelPhotoUrls.length) {
            primaryHotelPhotoUrl = allHotelPhotoUrls[0];
          }
          this.primaryHotelPhotoUrl = primaryHotelPhotoUrl;
          this.hotelPhotoCount = allHotelPhotoUrls.length;
          this.photoUrl =
            this.primaryHotelPhotoUrl ||
            data?.photo_url ||
            this.photoUrl ||
            '/storage/hotel/default.jpg';
          this.hotelAmenities = Array.isArray(data?.hotel_amenities)
            ? data.hotel_amenities
            : [];
          this.hotelLatitude =
            typeof data?.hotel_latitude === 'number'
              ? data.hotel_latitude
              : data?.hotel_latitude
                ? Number(data.hotel_latitude)
                : null;
          this.hotelLongitude =
            typeof data?.hotel_longitude === 'number'
              ? data.hotel_longitude
              : data?.hotel_longitude
                ? Number(data.hotel_longitude)
                : null;
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load availability';
          this.loading = false;
        }
      });
  }

  fullImgUrl(path: string | null | undefined): string {
    const fallback = '/storage/hotel/default.jpg';
    if (!path) return this.imgBaseUrl + fallback.replace(/^\//, '');
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return this.imgBaseUrl + path.replace(/^\//, '');
  }

  openHotelPhotos() {
    if (!this.hotelPhotos || !this.hotelPhotos.length) return;
    this.activeHotelCategoryIndex = 0;
    this.activeHotelPhotoIndex = 0;
    this.dialog.open(this.hotelPhotosTpl, {
      panelClass: 'hotel-photos-dialog',
      width: '960px',
      maxWidth: '96vw'
    });
  }

  currentHotelCategoryPhotos(): any[] {
    if (!this.hotelPhotos || !this.hotelPhotos.length) return [];
    const cat = this.hotelPhotos[this.activeHotelCategoryIndex] || null;
    const photos = Array.isArray(cat?.photos) ? cat.photos : [];
    return photos;
  }

  onHotelCategoryChange(index: number) {
    this.activeHotelCategoryIndex = index;
    this.activeHotelPhotoIndex = 0;
  }

  nextHotelPhoto() {
    const photos = this.currentHotelCategoryPhotos();
    if (!photos.length) return;
    this.activeHotelPhotoIndex =
      (this.activeHotelPhotoIndex + 1) % photos.length;
  }

  prevHotelPhoto() {
    const photos = this.currentHotelCategoryPhotos();
    if (!photos.length) return;
    this.activeHotelPhotoIndex =
      (this.activeHotelPhotoIndex - 1 + photos.length) % photos.length;
  }

  setHotelPhotoIndex(i: number) {
    const photos = this.currentHotelCategoryPhotos();
    if (!photos.length) return;
    if (i < 0 || i >= photos.length) return;
    this.activeHotelPhotoIndex = i;
  }

  openRoomPhotos(room: any) {
    const rawPhotos = Array.isArray(room?.room_photos) ? room.room_photos : [];
    const photos: string[] = rawPhotos
      .map((p: any) => (typeof p === 'string' ? p : p?.url || ''))
      .filter((p: string) => !!p);
    const primary = room?.room_photo_url || null;
    let list: string[] = photos;
    if (!list.length && primary) {
      list = [primary];
    }
    if (!list.length) {
      list = ['/storage/hotel/default.jpg'];
    }
    this.activeRoomPhotos = list;
    this.activeRoomPhotoIndex = 0;
    this.activeRoomMeta = room || null;
    this.dialog.open(this.roomPhotosTpl, {
      panelClass: 'room-photos-dialog'
    });
  }

  closeRoomPhotos() {
    this.dialog.closeAll();
  }

  closeHotelPhotos() {
    this.dialog.closeAll();
  }

  nextRoomPhoto() {
    if (!this.activeRoomPhotos.length) return;
    this.activeRoomPhotoIndex =
      (this.activeRoomPhotoIndex + 1) % this.activeRoomPhotos.length;
  }

  prevRoomPhoto() {
    if (!this.activeRoomPhotos.length) return;
    this.activeRoomPhotoIndex =
      (this.activeRoomPhotoIndex - 1 + this.activeRoomPhotos.length) %
      this.activeRoomPhotos.length;
  }

  setRoomPhotoIndex(i: number) {
    if (i < 0 || i >= this.activeRoomPhotos.length) return;
    this.activeRoomPhotoIndex = i;
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
    this.roomsConfig.push({ adults: 2, children: 0, childAges: [] });
  }

  decrementRooms() {
    if (this.roomsConfig.length <= 1) return;
    this.roomsConfig.pop();
  }

  incrementAdults(i: number) {
    const room = this.roomsConfig[i];
    if (!room) return;
    if (room.adults >= 4) return;
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
  }

  decrementChildren(i: number) {
    const room = this.roomsConfig[i];
    if (!room) return;
    if (room.children <= 0) return;
    room.children -= 1;
    room.childAges.pop();
  }

  setChildAge(roomIndex: number, childIndex: number, age: number) {
    const room = this.roomsConfig[roomIndex];
    if (!room) return;
    room.childAges[childIndex] = age;
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

  onSelectLocation(option: any) {
    if (!option) return;
    if (option.type === 'hotel' && option.id) {
      this.selectedHotelId = Number(option.id);
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
  }

  loadConfirmAvailabilityForHotel(hotelId: number) {
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
          return;
        }
        const invId = Number(match.inventory_id || match.id);
        if (invId) {
          this.selectedInventoryId = invId;
        }
      },
      error: () => {}
    });
  }

  loadNormalInventoryForHotel(hotelId: number) {
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
        if (match) {
          const invId = Number(match.inventory_id || match.id);
          if (invId) {
            this.selectedInventoryId = invId;
          }
        }
      },
      error: () => {}
    });
  }

  loadConfirmDates(inventoryId: number) {
    if (!inventoryId) return;
    this.confirmAvailabilityLoading = true;
    this.confirmAvailabilityError = '';
    this.confirmAvailableDates = [];
    this.hotelService.getInventoryDates(inventoryId).subscribe({
      next: (datesRes: any) => {
        const roomsData = Array.isArray(datesRes?.data)
          ? datesRes.data
          : Array.isArray(datesRes)
            ? datesRes
            : [];
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
        this.confirmAvailableDates = Object.keys(countMap)
          .filter((d) => countMap[d] > 0)
          .sort()
          .map((d) => ({ date: d, total: countMap[d] }));
        this.confirmAvailabilityLoading = false;
      },
      error: () => {
        this.confirmAvailabilityError =
          'Failed to load confirm availability dates';
        this.confirmAvailabilityLoading = false;
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
      return;
    }
    const v = this.form.value;
    const from = v.checkIn ? this.formatDate(v.checkIn as Date) : '';
    const to = v.checkOut ? this.formatDate(v.checkOut as Date) : '';
    const childAgesCombined: number[] = this.roomsConfig
      .reduce((acc: number[], r) => acc.concat(r.childAges || []), [])
      .filter((x) => typeof x === 'number' && !isNaN(x));
    const invId = Number(
      this.selectedInventoryId || this.params.inventory_id || 0
    );
    this.params = {
      ...this.params,
      from,
      to,
      rooms: v.rooms,
      adults: v.adults,
      children: v.children,
      childAges: childAgesCombined,
      inventory_id: invId,
      type: this.searchType
    };
    this.loadData();
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

  formatIncluded(opt: any): string {
    const a = Number(opt?.included?.adults ?? 0);
    const cp = Number(opt?.included?.children_paying ?? 0);
    const age = Number(opt?.included?.free_child_age ?? 0);
    const childLabel = cp === 1 ? 'Child' : 'Children';
    const ageText = age ? ` (upto ${age}y)` : '';
    return `Included for ${a} Adults, ${cp} ${childLabel}${ageText}`;
  }

  hasFreeChild(opt: any): boolean {
    return Number(opt?.included?.children_free ?? 0) > 0;
  }

  isBreakfast(opt: any): boolean {
    const name = String(opt?.meal_type_name || '').toLowerCase();
    return name.includes('breakfast') || name.includes('super package');
  }

  onBookOption(room: any, opt: any) {
    const prices = Array.isArray(room?.prices) ? room.prices : [];
    const mealId = Number(opt?.meal_type ?? 0);
    const effPersons =
      Number(opt?.included?.adults ?? 0) +
      Number(opt?.included?.children_paying ?? 0);
    const match = prices.find((p: any) => {
      const pMeal = Number(p?.meal_type ?? 0);
      const pPerson = Number(p?.person ?? 0);
      return pMeal === mealId && pPerson === effPersons;
    });
    const detailId =
      (opt && opt.detail_id != null ? opt.detail_id : match?.id) ?? null;
    const payload: any = {
      from: this.params.from || null,
      to: this.params.to || null,
      rooms: this.params.rooms || null,
      adults: this.params.adults || null,
      children: this.params.children || null,
      childAges: this.params.childAges || null,
      inventory_id: this.params.inventory_id || null,
      selected_room_id: room?.room_id ?? null,
      selected_meal_type: opt?.meal_type ?? null,
      selected_meal_type_name: opt?.meal_type_name ?? null,
      price_total: opt?.total_price ?? null,
      selected_detail_id: detailId,
      selected_option: {
        meal_type: opt?.meal_type ?? null,
        meal_type_name: opt?.meal_type_name ?? null,
        rooms_used: opt?.rooms_used ?? null,
        childAges: this.params.childAges || null,
        extra_beds_used: opt?.extra_beds_used ?? null,
        extra_bed_price: opt?.extra_bed_price ?? null,
        total_price: opt?.total_price ?? null,
        detail_id: detailId
      }
    };
    try {
      const raw = JSON.stringify(payload);
      localStorage.setItem('hotel_booking_selection', raw);
    } catch {}
    this.router.navigate(['/hotels/booking-confirmation']);
  }

  private buildDateList(from: string, to: string): string[] {
    const res: string[] = [];
    if (!from || !to) return res;
    const f = this.parseDate(from);
    const t = this.parseDate(to);
    if (!f || !t) return res;
    for (let cur = new Date(f); cur < t; cur.setDate(cur.getDate() + 1)) {
      res.push(this.formatDate(cur));
    }
    return res;
  }

  private dayCode(dt: string): string {
    const d = this.parseDate(dt);
    if (!d) return 'mon';
    const n = d.getDay(); // 0 Sun .. 6 Sat
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][n];
  }
}
