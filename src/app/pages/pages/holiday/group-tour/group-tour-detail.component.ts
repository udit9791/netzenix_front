import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from 'src/environments/environment';

interface GroupTourMealPlan {
  id: number;
  name?: string | null;
}

interface GroupTourHotelRoom {
  inventory_id: number;
  room_id: number;
  room_name?: string | null;
  meal_plan_ids?: number[];
  meal_plans?: GroupTourMealPlan[];
  is_default_meal_plan?: boolean;
}

interface GroupTourHotel {
  id: number;
  name: string;
  address?: string | null;
  photo_url?: string | null;
  is_default?: boolean;
  rooms?: GroupTourHotelRoom[];
}

interface GroupTourDay {
  title?: string | null;
  description?: string | null;
  images?: string[];
  hotels?: GroupTourHotel[];
  hotelWarning?: string | null;
  date?: string | null;
  extra_adults?: number | null;
  children_with_bed?: number | null;
  no_of_rooms?: number | null;
  default_hotel_id?: number | null;
  default_meal_plan_id?: number | null;
}

interface GroupTourVehicle {
  id: number;
  name: string;
  photo?: string | null;
  type?: string | null;
  max_occupancy?: number | null;
  is_default?: any;
  vehicles_required?: number | null;
}

interface GroupTourDetailPayload {
  id: number;
  name: string;
  description?: string | null;
  nights?: number | null;
  maxSeats?: number | null;
  travelType?: string | null;
  fromPrice?: number | null;
  pricing?: any;
  banner_image?: string | null;
  bannerImage?: string | null;
  groupDates?: string[];
  days?: GroupTourDay[];
  depart_from?: string[];
  vehicles?: GroupTourVehicle[];
  inclusions?: string | null;
  exclusions?: string | null;
  terms?: string | null;
  booknow?: boolean;
}

const GROUP_TOUR_DATE_FORMATS = {
  parse: {
    dateInput: 'dd/MM/yyyy'
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

@Component({
  selector: 'app-group-tour-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatRadioModule,
    MatDividerModule
  ],
  templateUrl: './group-tour-detail.component.html',
  styleUrls: ['./group-tour-detail.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: MAT_DATE_FORMATS, useValue: GROUP_TOUR_DATE_FORMATS }],
  styles: [
    `
      .mat-calendar-body-disabled > .mat-calendar-body-cell-content {
        text-decoration: line-through !important;
        color: rgba(0, 0, 0, 0.38) !important;
      }

      .mat-calendar-body-cell:not(.mat-calendar-body-disabled):not(
          .mat-calendar-body-selected
        )
        .mat-calendar-body-cell-content {
        background-color: #2e7d32;
        color: #ffffff;
        border-radius: 50%;
      }
    `
  ]
})
export class GroupTourDetailComponent implements OnInit {
  @ViewChild('roomsGuestsTpl') roomsGuestsTpl!: TemplateRef<any>;
  @ViewChild('bookNowTpl') bookNowTpl!: TemplateRef<any>;
  @ViewChild('dayHotelSelectionTpl') dayHotelSelectionTpl!: TemplateRef<any>;
  @ViewChild('downloadItineraryTpl') downloadItineraryTpl!: TemplateRef<any>;

  loading = true;
  error: string | null = null;
  detail: GroupTourDetailPayload | null = null;
  mainImage: string | null = null;
  galleryImages: string[] = [];
  leavingFrom: string | null = null;
  roomOption: string | null = null;
  leavingOn: Date | null = null;
  transportationType: string | null = 'SIC';
  selectedVehicleId: number | null = null;
  selectedVehicles: { [id: number]: number } = {};
  vehicleSelectionError: string | null = null;
  canBook = false;
  roomsGuestsLabel = '';
  roomOptions: string[] = [
    '1 Room, 1 Adult',
    '1 Room, 2 Adults',
    '2 Rooms, 4 Adults',
    '3 Rooms, 6 Adults'
  ];
  roomsConfig: {
    adults: number;
    children: number;
    childAges: number[];
    extraBedFlags: boolean[];
  }[] = [{ adults: 1, children: 0, childAges: [], extraBedFlags: [] }];
  childAgeOptions: number[] = Array.from({ length: 18 }, (_, i) => i);
  petFriendly = false;
  departureMonthFilters: { key: string; label: string }[] = [];
  activeMonthKey = 'ALL';
  selectedDeparture: string | null = null;
  selectedPrimaryPrivateVehicleId: number | null = null;
  itineraryId: number | null = null;
  activeDayIndexForDialog: number | null = null;
  dayRoomOptions: { [dayIndex: number]: GroupTourHotelRoom[] } = {};
  daySelectedRoomId: { [dayIndex: number]: number | null } = {};
  daySelectedMealId: { [dayIndex: number]: number | null } = {};
  daySelectedHotelId: { [dayIndex: number]: number | null } = {};
  downloadCustomerName = '';
  downloadShowPrice = true;
  downloadShowCompanyDetails = true;
  private downloadDialogRef: any = null;
  leavingDateFilter = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    return this.groupDates.includes(key);
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;
    if (!id) {
      this.error = 'Invalid package id';
      this.loading = false;
      return;
    }
    this.itineraryId = id;
    this.loadDetails(id);
  }

  private loadDetails(
    id: number,
    extraParams?: any,
    afterSuccess?: () => void
  ): void {
    this.loading = true;
    this.error = null;
    const options: any = {};
    console.log(extraParams);
    if (extraParams) {
      const qp = this.route.snapshot.queryParamMap;
      const selDayIds = qp.getAll('sel_day_ids[]');
      const selHotelIds = qp.getAll('sel_hotel_ids[]');
      const selRoomIds = qp.getAll('sel_room_ids[]');
      const selMealIds = qp.getAll('sel_meal_plan_ids[]');
      const selectionParams: any = {};
      if (selDayIds && selDayIds.length > 0) {
        selectionParams['sel_day_ids[]'] = selDayIds;
      }
      if (selHotelIds && selHotelIds.length > 0) {
        selectionParams['sel_hotel_ids[]'] = selHotelIds;
      }
      if (selRoomIds && selRoomIds.length > 0) {
        selectionParams['sel_room_ids[]'] = selRoomIds;
      }
      if (selMealIds && selMealIds.length > 0) {
        selectionParams['sel_meal_plan_ids[]'] = selMealIds;
      }
      options.params = { ...extraParams, ...selectionParams };
    } else {
      const qp = this.route.snapshot.queryParamMap;
      const paramsFromRoute: any = {};
      [
        'departure',
        'rooms',
        'adults',
        'children',
        'date',
        'transportationType',
        'child_ages',
        'childAges',
        'vehicle_id',
        'vehicleId',
        'vehicles'
      ].forEach((key) => {
        const v = qp.get(key);
        if (v !== null) {
          paramsFromRoute[key] = v;
        }
      });
      const childAgesArr = qp.getAll('child_ages[]');
      if (childAgesArr && childAgesArr.length > 0) {
        paramsFromRoute['child_ages[]'] = childAgesArr;
      }
      const extraBedsArr = qp.getAll('extra_beds[]');
      if (extraBedsArr && extraBedsArr.length > 0) {
        paramsFromRoute['extra_beds[]'] = extraBedsArr;
      }
      const selDayIds = qp.getAll('sel_day_ids[]');
      if (selDayIds && selDayIds.length > 0) {
        paramsFromRoute['sel_day_ids[]'] = selDayIds;
      }
      const selHotelIds = qp.getAll('sel_hotel_ids[]');
      if (selHotelIds && selHotelIds.length > 0) {
        paramsFromRoute['sel_hotel_ids[]'] = selHotelIds;
      }
      const selRoomIds = qp.getAll('sel_room_ids[]');
      if (selRoomIds && selRoomIds.length > 0) {
        paramsFromRoute['sel_room_ids[]'] = selRoomIds;
      }
      const selMealIds = qp.getAll('sel_meal_plan_ids[]');
      if (selMealIds && selMealIds.length > 0) {
        paramsFromRoute['sel_meal_plan_ids[]'] = selMealIds;
      }
      // alert(selMealIds);
      if (Object.keys(paramsFromRoute).length > 0) {
        options.params = paramsFromRoute;
      }
    }

    this.http
      .get<any>(`${environment.apiUrl}/itineraries/${id}`, options)
      .subscribe({
        next: (res: any) => {
          const isInitial = !this.detail;
          const data: GroupTourDetailPayload = res && res.data ? res.data : res;
          this.detail = data;
          this.prepareImages(id, data);
          if (isInitial) {
            this.initBookingDefaults();
          }
          this.initDayHotelSelections();
          Promise.resolve().then(() => {
            this.initVehicleSelection();
            this.buildDepartureMonthFilters();
            this.loading = false;
            if (afterSuccess) {
              afterSuccess();
            }
          });
        },
        error: () => {
          this.error = 'Failed to load package details';
          this.loading = false;
        }
      });
  }

  openDownloadItineraryDialog(): void {
    if (!this.itineraryId) {
      this.snackBar.open('Itinerary not loaded', 'Close', {
        duration: 3000
      });
      return;
    }

    this.downloadCustomerName = '';
    this.downloadShowPrice = true;
    this.downloadShowCompanyDetails = true;
    this.downloadDialogRef = this.dialog.open(this.downloadItineraryTpl, {
      width: '420px'
    });
  }

  confirmDownloadItineraryPdf(): void {
    if (this.downloadDialogRef) {
      this.downloadDialogRef.close();
    }
    this.downloadItineraryPdf({
      customerName: this.downloadCustomerName,
      showPrice: this.downloadShowPrice,
      showCompanyDetails: this.downloadShowCompanyDetails
    });
  }

  downloadItineraryPdf(options?: {
    customerName?: string;
    showPrice?: boolean;
    showCompanyDetails?: boolean;
  }): void {
    if (!this.itineraryId) {
      this.snackBar.open('Itinerary not loaded', 'Close', {
        duration: 3000
      });
      return;
    }

    const url = `${environment.apiUrl}/itineraries/${this.itineraryId}/download-pdf`;

    const qp = this.route.snapshot.queryParamMap;
    const paramsFromRoute: any = {};
    [
      'departure',
      'rooms',
      'adults',
      'children',
      'date',
      'transportationType',
      'child_ages',
      'childAges',
      'vehicle_id',
      'vehicleId',
      'vehicles'
    ].forEach((key) => {
      const v = qp.get(key);
      if (v !== null) {
        paramsFromRoute[key] = v;
      }
    });
    const childAgesArr = qp.getAll('child_ages[]');
    if (childAgesArr && childAgesArr.length > 0) {
      paramsFromRoute['child_ages[]'] = childAgesArr;
    }
    const extraBedsArr = qp.getAll('extra_beds[]');
    if (extraBedsArr && extraBedsArr.length > 0) {
      paramsFromRoute['extra_beds[]'] = extraBedsArr;
    }
    const selDayIds = qp.getAll('sel_day_ids[]');
    if (selDayIds && selDayIds.length > 0) {
      paramsFromRoute['sel_day_ids[]'] = selDayIds;
    }
    const selHotelIds = qp.getAll('sel_hotel_ids[]');
    if (selHotelIds && selHotelIds.length > 0) {
      paramsFromRoute['sel_hotel_ids[]'] = selHotelIds;
    }
    const selRoomIds = qp.getAll('sel_room_ids[]');
    if (selRoomIds && selRoomIds.length > 0) {
      paramsFromRoute['sel_room_ids[]'] = selRoomIds;
    }
    const selMealIds = qp.getAll('sel_meal_plan_ids[]');
    if (selMealIds && selMealIds.length > 0) {
      paramsFromRoute['sel_meal_plan_ids[]'] = selMealIds;
    }

    const params: any = { ...paramsFromRoute };
    if (options) {
      if (options.customerName) {
        params.customer_name = options.customerName;
      }
      if (options.showPrice !== undefined) {
        params.show_price = options.showPrice ? '1' : '0';
      }
      if (options.showCompanyDetails !== undefined) {
        params.show_company_details = options.showCompanyDetails ? '1' : '0';
      }
    }

    this.http.get(url, { responseType: 'blob', params }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `itinerary-${this.itineraryId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      },
      error: () => {
        this.snackBar.open('Failed to download itinerary PDF', 'Close', {
          duration: 3000
        });
      }
    });
  }

  private prepareImages(id: number, data: GroupTourDetailPayload): void {
    const bannerRaw = data.banner_image || data.bannerImage || '';
    if (bannerRaw) {
      const trimmed = bannerRaw.startsWith('/')
        ? bannerRaw.substring(1)
        : bannerRaw;
      this.mainImage = `${environment.imgUrl}/${trimmed}`;
    } else {
      this.mainImage = `https://picsum.photos/seed/itinerary-${id}/800/450`;
    }

    const imgs: string[] = [];
    if (Array.isArray(data.days)) {
      data.days.forEach((day) => {
        if (Array.isArray(day.images)) {
          day.images.forEach((img) => {
            if (img) {
              const trimmed = img.startsWith('/') ? img.substring(1) : img;
              imgs.push(`${environment.imgUrl}/${trimmed}`);
            }
          });
        }
      });
    }
    this.galleryImages = imgs;
  }

  getMealsForDayAndHotel(
    dayIndex: number,
    hotelId: number
  ): GroupTourMealPlan[] {
    if (!this.detail || !Array.isArray(this.detail.days)) {
      return [];
    }
    const day = this.detail.days[dayIndex];
    if (!day || !Array.isArray(day.hotels)) {
      return [];
    }
    const hotel = day.hotels.find((h) => h.id === hotelId);
    if (!hotel || !Array.isArray(hotel.rooms)) {
      return [];
    }
    const roomId = this.daySelectedRoomId[dayIndex];
    const room = hotel.rooms.find((r) => r.room_id === roomId);
    return room && Array.isArray(room.meal_plans) ? room.meal_plans : [];
  }

  getDefaultRoomNameForDay(day: any): string {
    if (!day || !Array.isArray(day.hotels) || !day.hotels.length) {
      return '';
    }
    const hotels = day.hotels as GroupTourHotel[];
    const defaultHotelId =
      typeof day.default_hotel_id === 'number' ? day.default_hotel_id : null;
    const hotel =
      (defaultHotelId !== null &&
        hotels.find((h) => h.id === defaultHotelId)) ||
      hotels.find((h) => (h as any).is_default) ||
      hotels[0];
    if (!hotel || !Array.isArray(hotel.rooms) || !hotel.rooms.length) {
      return '';
    }
    const rooms = hotel.rooms as GroupTourHotelRoom[];
    const defaultRoomId =
      typeof day.default_room_id === 'number'
        ? day.default_room_id
        : (hotel as any).default_room_id &&
            typeof (hotel as any).default_room_id === 'number'
          ? (hotel as any).default_room_id
          : null;
    const room =
      (defaultRoomId !== null &&
        rooms.find((r) => r.room_id === defaultRoomId)) ||
      rooms.find((r) => r.is_default_meal_plan) ||
      rooms[0];
    return room && room.room_name ? room.room_name : '';
  }

  getDefaultMealPlanNameForDay(day: any): string {
    if (!day || !Array.isArray(day.hotels) || !day.hotels.length) {
      return '';
    }
    const hotels = day.hotels as GroupTourHotel[];
    const defaultHotelId =
      typeof day.default_hotel_id === 'number' ? day.default_hotel_id : null;
    const hotel =
      (defaultHotelId !== null &&
        hotels.find((h) => h.id === defaultHotelId)) ||
      hotels.find((h) => (h as any).is_default) ||
      hotels[0];
    if (!hotel || !Array.isArray(hotel.rooms) || !hotel.rooms.length) {
      return '';
    }
    const rooms = hotel.rooms as GroupTourHotelRoom[];
    const defaultRoomId =
      typeof day.default_room_id === 'number'
        ? day.default_room_id
        : (hotel as any).default_room_id &&
            typeof (hotel as any).default_room_id === 'number'
          ? (hotel as any).default_room_id
          : null;
    const defaultMealId =
      typeof day.default_meal_plan_id === 'number'
        ? day.default_meal_plan_id
        : (hotel as any).default_meal_plan_id &&
            typeof (hotel as any).default_meal_plan_id === 'number'
          ? (hotel as any).default_meal_plan_id
          : null;
    const room =
      (defaultRoomId !== null &&
        rooms.find((r) => r.room_id === defaultRoomId)) ||
      rooms.find((r) => r.is_default_meal_plan) ||
      rooms.find((r) => {
        const ids = r.meal_plan_ids || [];
        return defaultMealId !== null && ids.includes(defaultMealId);
      }) ||
      rooms[0];
    if (!room || !Array.isArray(room.meal_plans)) {
      return '';
    }
    const meal =
      (defaultMealId !== null &&
        room.meal_plans.find((m) => m.id === defaultMealId)) ||
      room.meal_plans[0];
    return meal && meal.name ? meal.name : '';
  }

  onDialogHotelChange(dayIndex: number, hotelId: number): void {
    if (!this.detail || !Array.isArray(this.detail.days)) {
      return;
    }
    const day = this.detail.days[dayIndex];
    if (!day || !Array.isArray(day.hotels)) {
      return;
    }
    const hotel = day.hotels.find((h) => h.id === hotelId);
    if (!hotel || !Array.isArray(hotel.rooms) || !hotel.rooms.length) {
      this.daySelectedRoomId[dayIndex] = null;
      this.daySelectedMealId[dayIndex] = null;
      return;
    }

    const defaultMealId =
      typeof day.default_meal_plan_id === 'number'
        ? day.default_meal_plan_id
        : null;

    const selectedRoom: GroupTourHotelRoom =
      hotel.rooms.find((r) => r.is_default_meal_plan) ||
      hotel.rooms.find((r) => {
        const ids = r.meal_plan_ids || [];
        return defaultMealId !== null && ids.includes(defaultMealId);
      }) ||
      hotel.rooms[0];

    if (!selectedRoom) {
      this.daySelectedRoomId[dayIndex] = null;
      this.daySelectedMealId[dayIndex] = null;
      return;
    }

    this.daySelectedRoomId[dayIndex] = selectedRoom.room_id;

    const mealIds = selectedRoom.meal_plan_ids || [];
    let selectedMealId: number | null =
      defaultMealId !== null && mealIds.includes(defaultMealId)
        ? defaultMealId
        : mealIds.length
          ? mealIds[0]
          : null;

    this.daySelectedMealId[dayIndex] = selectedMealId;
  }

  onDayDialogRoomChange(dayIndex: number, hotelId: number): void {
    if (!this.detail || !Array.isArray(this.detail.days)) {
      return;
    }
    const day = this.detail.days[dayIndex];
    if (!day || !Array.isArray(day.hotels)) {
      return;
    }
    const hotel = day.hotels.find((h) => h.id === hotelId);
    if (!hotel || !Array.isArray(hotel.rooms)) {
      return;
    }
    const roomId = this.daySelectedRoomId[dayIndex];
    const room = hotel.rooms.find((r) => r.room_id === roomId);
    if (!room) {
      this.daySelectedMealId[dayIndex] = null;
      return;
    }

    const defaultMealId =
      typeof day.default_meal_plan_id === 'number'
        ? day.default_meal_plan_id
        : null;
    const mealIds = room.meal_plan_ids || [];

    let selectedMealId: number | null =
      defaultMealId !== null && mealIds.includes(defaultMealId)
        ? defaultMealId
        : mealIds.length
          ? mealIds[0]
          : null;

    this.daySelectedMealId[dayIndex] = selectedMealId;
  }

  onDialogMealChange(dayIndex: number, mealId: number): void {
    if (!this.daySelectedMealId) {
      this.daySelectedMealId = {};
    }
    this.daySelectedMealId[dayIndex] = mealId;
  }

  private initDayHotelSelections(): void {
    this.dayRoomOptions = {};
    this.daySelectedRoomId = {};
    this.daySelectedMealId = {};
    this.daySelectedHotelId = {};

    if (!this.detail || !Array.isArray(this.detail.days)) {
      return;
    }

    this.detail.days.forEach((day, index) => {
      const hotels = day.hotels || [];
      if (!hotels.length) {
        return;
      }

      const defaultHotelId = day.default_hotel_id || null;
      const defaultHotel =
        hotels.find((h) => h.id === defaultHotelId) ||
        hotels.find((h) => h.is_default) ||
        hotels[0];

      if (
        !defaultHotel ||
        !Array.isArray(defaultHotel.rooms) ||
        !defaultHotel.rooms.length
      ) {
        return;
      }

      const rooms = defaultHotel.rooms;
      this.dayRoomOptions[index] = rooms;
      this.daySelectedHotelId[index] = defaultHotel.id;

      const hotelDefaultRoomId =
        (defaultHotel as any).default_room_id &&
        typeof (defaultHotel as any).default_room_id === 'number'
          ? (defaultHotel as any).default_room_id
          : null;

      const defaultMealId =
        typeof day.default_meal_plan_id === 'number'
          ? day.default_meal_plan_id
          : (defaultHotel as any).default_meal_plan_id &&
              typeof (defaultHotel as any).default_meal_plan_id === 'number'
            ? (defaultHotel as any).default_meal_plan_id
            : null;

      let selectedRoom: GroupTourHotelRoom | undefined =
        (hotelDefaultRoomId !== null &&
          rooms.find((r) => r.room_id === hotelDefaultRoomId)) ||
        rooms.find((r) => r.is_default_meal_plan) ||
        rooms.find((r) => {
          const ids = r.meal_plan_ids || [];
          return defaultMealId !== null && ids.includes(defaultMealId);
        }) ||
        rooms[0];

      if (!selectedRoom) {
        return;
      }

      const selectedRoomId = selectedRoom.room_id;
      this.daySelectedRoomId[index] = selectedRoomId;

      const mealIds = selectedRoom.meal_plan_ids || [];
      let selectedMealId: number | null =
        defaultMealId !== null && mealIds.includes(defaultMealId)
          ? defaultMealId
          : mealIds.length
            ? mealIds[0]
            : null;

      this.daySelectedMealId[index] = selectedMealId;
    });
  }

  private getInventoryIdForDay(dayIndex: number): number | null {
    if (!this.detail || !Array.isArray(this.detail.days)) {
      return null;
    }
    const day = this.detail.days[dayIndex];
    if (!day || !Array.isArray(day.hotels) || !day.hotels.length) {
      return null;
    }

    const defaultHotelId = day.default_hotel_id || null;
    const hotel =
      day.hotels.find((h) => h.id === defaultHotelId) ||
      day.hotels.find((h) => h.is_default) ||
      day.hotels[0];

    if (!hotel || !Array.isArray(hotel.rooms) || !hotel.rooms.length) {
      return null;
    }

    const selectedRoomId = this.daySelectedRoomId[dayIndex];
    const rooms = hotel.rooms as GroupTourHotelRoom[];
    const room =
      (selectedRoomId && rooms.find((r) => r.room_id === selectedRoomId)) ||
      rooms[0];

    if (!room || typeof room.inventory_id !== 'number') {
      return null;
    }
    return room.inventory_id;
  }

  openHotelSelectionDialog(dayIndex: number): void {
    if (!this.detail || !Array.isArray(this.detail.days) || !this.itineraryId) {
      return;
    }
    const day = this.detail.days[dayIndex];
    if (!day) {
      return;
    }

    const dayId = (day as any).itinerary_day_id || null;
    if (!dayId) {
      return;
    }

    const params: any = {
      day_id: String(dayId)
    };

    this.activeDayIndexForDialog = dayIndex;

    this.http
      .get<any>(
        `${environment.apiUrl}/itineraries/${this.itineraryId}/day-detail`,
        {
          params
        }
      )
      .subscribe({
        next: (res: any) => {
          const payload = res && res.data ? res.data : res;
          const hotels: GroupTourHotel[] = Array.isArray(payload?.hotels)
            ? payload.hotels
            : [];
          if (!hotels.length) {
            return;
          }

          const dayDetail =
            this.detail && Array.isArray(this.detail.days)
              ? this.detail.days[dayIndex]
              : null;

          if (dayDetail) {
            dayDetail.hotels = hotels;
          }

          const defaultHotelId =
            dayDetail && dayDetail.default_hotel_id
              ? dayDetail.default_hotel_id
              : null;

          const selectedHotel: GroupTourHotel =
            hotels.find((h) => h.id === defaultHotelId) ||
            hotels.find((h) => h.is_default) ||
            hotels[0];

          const rooms: GroupTourHotelRoom[] = Array.isArray(selectedHotel.rooms)
            ? selectedHotel.rooms
            : [];

          this.dayRoomOptions[dayIndex] = rooms;
          this.daySelectedHotelId[dayIndex] = selectedHotel.id;

          const defaultMealId =
            dayDetail && typeof dayDetail.default_meal_plan_id === 'number'
              ? dayDetail.default_meal_plan_id
              : selectedHotel &&
                  typeof (selectedHotel as any).default_meal_plan_id ===
                    'number'
                ? (selectedHotel as any).default_meal_plan_id
                : null;

          if (rooms.length) {
            const selectedRoom: GroupTourHotelRoom =
              rooms.find((r) => r.is_default_meal_plan) ||
              rooms.find((r) => {
                const ids = r.meal_plan_ids || [];
                return defaultMealId !== null && ids.includes(defaultMealId);
              }) ||
              rooms[0];

            this.daySelectedRoomId[dayIndex] = selectedRoom.room_id;

            const mealIds = selectedRoom.meal_plan_ids || [];
            let selectedMealId: number | null =
              defaultMealId !== null && mealIds.includes(defaultMealId)
                ? defaultMealId
                : mealIds.length
                  ? mealIds[0]
                  : null;

            this.daySelectedMealId[dayIndex] = selectedMealId;
          } else {
            this.daySelectedRoomId[dayIndex] = null;
            this.daySelectedMealId[dayIndex] = null;
          }

          const dialogRef = this.dialog.open(this.dayHotelSelectionTpl, {
            data: {
              dayIndex,
              hotels
            }
          });

          dialogRef.afterClosed().subscribe((result) => {
            this.activeDayIndexForDialog = null;
          });
        },
        error: () => {
          return;
        }
      });
  }

  private initBookingDefaults(): void {
    const cities = this.departFrom;
    const qp = this.route.snapshot.queryParamMap;
    const departureParam = qp.get('departure');
    const dateParam = qp.get('date');
    const transportParam = qp.get('transportationType');
    const vehiclesParam = qp.get('vehicles');
    const childAgesFromRouteRaw = qp.getAll('child_ages[]');
    const extraBedsFromRouteRaw = qp.getAll('extra_beds[]');

    if (departureParam && cities.includes(departureParam)) {
      this.leavingFrom = departureParam;
    } else if (cities.length) {
      this.leavingFrom = cities[0];
    }

    const dates = this.groupDates;
    if (dateParam) {
      const dtFromRoute = this.parseDate(dateParam);
      if (dtFromRoute) {
        this.leavingOn = dtFromRoute;
      }
      if (dates.includes(dateParam)) {
        this.selectedDeparture = dateParam;
      }
    } else if (dates.length) {
      const raw = dates[0];
      const parts = raw.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map((v) => Number(v));
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
          this.leavingOn = new Date(y, m - 1, d);
        }
      } else {
        const dt = new Date(raw);
        if (!Number.isNaN(dt.getTime())) {
          this.leavingOn = dt;
        }
      }
    }
    if (transportParam === 'SIC' || transportParam === 'Private') {
      this.transportationType = transportParam;
    } else {
      this.transportationType = 'SIC';
    }
    const roomsParam = qp.get('rooms');
    const adultsParam = qp.get('adults');
    const childrenParam = qp.get('children');
    if (roomsParam !== null || adultsParam !== null || childrenParam !== null) {
      let roomsCount = Number(roomsParam);
      if (!roomsCount || roomsCount < 1) {
        roomsCount = 1;
      }
      if (roomsCount > 4) {
        roomsCount = 4;
      }
      let adultsTotal = Number(adultsParam);
      if (!adultsTotal || adultsTotal < 0) {
        adultsTotal = roomsCount * 2;
      }
      let childrenTotal = Number(childrenParam);
      if (!childrenParam || isNaN(childrenTotal) || childrenTotal < 0) {
        childrenTotal = 0;
      }
      const cfg: {
        adults: number;
        children: number;
        childAges: number[];
        extraBedFlags: boolean[];
      }[] = [];
      let remainingAdults = adultsTotal;
      let remainingChildren = childrenTotal;
      const childAgesFlat: number[] = [];
      childAgesFromRouteRaw.forEach((val) => {
        const num = Number(val);
        if (!Number.isNaN(num)) {
          childAgesFlat.push(num);
        }
      });
      const extraBedsFlat = extraBedsFromRouteRaw.slice();
      let childIdx = 0;
      let bedIdx = 0;
      for (let i = 0; i < roomsCount; i++) {
        const roomsLeft = roomsCount - i;
        const adultsForRoom =
          roomsLeft > 0 ? Math.floor(remainingAdults / roomsLeft) : 0;
        const childrenForRoom =
          roomsLeft > 0 ? Math.floor(remainingChildren / roomsLeft) : 0;
        const roomChildAges: number[] = [];
        const roomExtraBeds: boolean[] = [];
        for (let j = 0; j < childrenForRoom; j++) {
          let age = 5;
          if (childIdx < childAgesFlat.length) {
            const v = childAgesFlat[childIdx];
            if (!Number.isNaN(v) && v > 0) {
              age = v;
            }
          }
          roomChildAges.push(age);
          childIdx++;

          let flag = false;
          if (bedIdx < extraBedsFlat.length) {
            const raw = extraBedsFlat[bedIdx];
            flag = raw === '1' || raw === 'true' || raw === 'TRUE';
          }
          roomExtraBeds.push(flag);
          bedIdx++;
        }
        cfg.push({
          adults: adultsForRoom,
          children: childrenForRoom,
          childAges: roomChildAges,
          extraBedFlags: roomExtraBeds
        });
        remainingAdults -= adultsForRoom;
        remainingChildren -= childrenForRoom;
      }
      this.roomsConfig = cfg;
      const rooms = this.roomsConfig.length;
      const adults = this.roomsConfig.reduce((s, r) => s + r.adults, 0);
      const children = this.roomsConfig.reduce((s, r) => s + r.children, 0);
      const parts = [`${rooms} Rooms`, `${adults} Adults`];
      if (children > 0) {
        parts.push(`${children} Children`);
      }
      this.roomsGuestsLabel = parts.join(' • ');
      this.roomOption = this.roomsGuestsLabel;
    } else {
      this.roomOption = this.roomOptions[0] || null;
      this.roomsGuestsLabel = this.roomOption || '1 Room, 2 Adults';
    }

    if (transportParam === 'Private' && vehiclesParam) {
      try {
        const parsed = JSON.parse(vehiclesParam);
        const map: { [id: number]: number } = {};
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const vid = Number(item && item.id);
            const qty = Number(item && item.qty);
            if (vid > 0 && qty > 0) {
              map[vid] = qty;
            }
          });
        }
        this.selectedVehicles = map;
      } catch {
        this.selectedVehicles = {};
      }
    }
  }

  private buildDepartureMonthFilters(): void {
    const dates = this.groupDates;
    const map = new Map<string, string>();
    dates.forEach((raw) => {
      const dt = this.parseDate(raw);
      if (!dt) {
        return;
      }
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthName = dt.toLocaleDateString('en-US', {
        month: 'short'
      });
      const label = `${monthName.toUpperCase()} ${dt.getFullYear()}`;
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    this.departureMonthFilters = Array.from(map.entries()).map(
      ([key, label]) => ({ key, label })
    );
    if (!this.selectedDeparture && dates.length) {
      this.selectedDeparture = dates[0];
    }
  }

  get groupDates(): string[] {
    if (!this.detail || !Array.isArray(this.detail.groupDates)) {
      return [];
    }
    return this.detail.groupDates;
  }

  get filteredGroupDates(): string[] {
    const dates = this.groupDates;
    if (!this.activeMonthKey || this.activeMonthKey === 'ALL') {
      return dates;
    }
    return dates.filter((raw) => {
      const dt = this.parseDate(raw);
      if (!dt) {
        return false;
      }
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      return key === this.activeMonthKey;
    });
  }

  get departFrom(): string[] {
    if (!this.detail || !Array.isArray(this.detail.depart_from)) {
      return [];
    }
    return this.detail.depart_from;
  }

  onSelectDepartureCity(city: string): void {
    if (!city) {
      return;
    }
    this.leavingFrom = city;
  }

  get hasDayHotelWarning(): boolean {
    if (!this.detail || !Array.isArray(this.detail.days)) {
      return false;
    }
    return this.detail.days.some((d) => !!d.hotelWarning);
  }

  get nightsText(): string {
    if (!this.detail || !this.detail.nights) {
      return '';
    }
    const nights = this.detail.nights;
    const days = nights + 1;
    return `${nights} Nights / ${days} Days`;
  }

  formatDepartureDate(value: string): string {
    if (!value) {
      return '';
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const dd = d.padStart(2, '0');
      const mm = m.padStart(2, '0');
      return `${dd}/${mm}/${y}`;
    }
    const dt = new Date(value);
    if (isNaN(dt.getTime())) {
      return value;
    }
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  formatDepartureLong(value: string): string {
    const dt = this.parseDate(value);
    if (!dt) {
      return this.formatDepartureDate(value);
    }
    const nights = this.detail?.nights ?? null;
    if (!nights || nights <= 0) {
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        weekday: 'short'
      });
    }
    const end = new Date(dt);
    end.setDate(end.getDate() + nights);
    const startStr = dt.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      weekday: 'short'
    });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      weekday: 'short'
    });
    return `${startStr} - ${endStr}`;
  }

  formatDepartureMonth(value: string): string {
    const dt = this.parseDate(value);
    if (!dt) {
      return '';
    }
    return dt.toLocaleDateString('en-US', {
      month: 'long'
    });
  }

  formatPrice(value: number | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.toLocaleString('en-IN');
  }

  onSelectDeparture(value: string): void {
    this.selectedDeparture = value;
    const dt = this.parseDate(value);
    if (dt) {
      this.leavingOn = dt;
    }
    this.canBook = false;
  }

  onTransportationTypeChange(value: string): void {
    const t = value === 'Private' ? 'Private' : 'SIC';
    this.transportationType = t;
    this.canBook = false;
    this.vehicleSelectionError = null;
    if (t === 'Private') {
      this.selectedVehicleId = null;
    } else {
      this.selectedVehicles = {};
    }
    const qp = this.route.snapshot.queryParamMap;
    const params: any = {};
    ['departure', 'rooms', 'adults', 'children', 'date'].forEach((key) => {
      const v = qp.get(key);
      if (v !== null) {
        params[key] = v;
      }
    });
    const childAgesArr = qp.getAll('child_ages[]');
    if (childAgesArr && childAgesArr.length > 0) {
      params['child_ages[]'] = childAgesArr;
    }
    const extraBedsArr = qp.getAll('extra_beds[]');
    if (extraBedsArr && extraBedsArr.length > 0) {
      params['extra_beds[]'] = extraBedsArr;
    }
    params.transportationType = t;
    params.vehicle_id = null;
    params.vehicleId = null;
    params.vehicle_ids = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
    const id = this.detail?.id;
    if (id) {
      setTimeout(() => {
        this.loadDetails(id, params);
      });
    }
  }

  onOpenRoomsGuests(): void {
    if (!this.roomsGuestsTpl) {
      return;
    }
    this.dialog.open(this.roomsGuestsTpl, {
      width: '640px'
    });
  }

  onCancelRoomsGuests(): void {
    this.dialog.closeAll();
  }

  incrementRooms(): void {
    if (this.roomsConfig.length >= 4) {
      return;
    }
    this.roomsConfig.push({
      adults: 2,
      children: 0,
      childAges: [],
      extraBedFlags: []
    });
    this.canBook = false;
  }

  decrementRooms(): void {
    if (this.roomsConfig.length <= 1) {
      return;
    }
    this.roomsConfig.pop();
    this.canBook = false;
  }

  incrementAdults(i: number): void {
    const room = this.roomsConfig[i];
    if (!room) {
      return;
    }
    if (room.adults >= 20) {
      return;
    }
    room.adults += 1;
    this.canBook = false;
  }

  decrementAdults(i: number): void {
    const room = this.roomsConfig[i];
    if (!room) {
      return;
    }
    if (room.adults <= 1) {
      return;
    }
    room.adults -= 1;
    this.canBook = false;
  }

  incrementChildren(i: number): void {
    const room = this.roomsConfig[i];
    if (!room) {
      return;
    }
    if (room.children >= 4) {
      return;
    }
    room.children += 1;
    room.childAges.push(5);
    room.extraBedFlags.push(false);
    this.canBook = false;
  }

  decrementChildren(i: number): void {
    const room = this.roomsConfig[i];
    if (!room) {
      return;
    }
    if (room.children <= 0) {
      return;
    }
    room.children -= 1;
    room.childAges.pop();
    room.extraBedFlags.pop();
    this.canBook = false;
  }

  setChildAge(roomIndex: number, childIndex: number, age: number): void {
    const room = this.roomsConfig[roomIndex];
    if (!room) {
      return;
    }
    room.childAges[childIndex] = age;
    this.canBook = false;
  }

  toggleExtraBed(
    roomIndex: number,
    childIndex: number,
    checked: boolean
  ): void {
    const room = this.roomsConfig[roomIndex];
    if (!room) {
      return;
    }
    if (!room.extraBedFlags || room.extraBedFlags.length !== room.children) {
      room.extraBedFlags = Array.from({ length: room.children }, () => false);
    }
    room.extraBedFlags[childIndex] = checked;
    this.canBook = false;
  }

  applyRoomsGuests(): void {
    const rooms = this.roomsConfig.length;
    const adults = this.roomsConfig.reduce((s, r) => s + r.adults, 0);
    const children = this.roomsConfig.reduce((s, r) => s + r.children, 0);
    const parts = [`${rooms} Rooms`, `${adults} Adults`];
    if (children > 0) {
      parts.push(`${children} Children`);
    }
    this.roomsGuestsLabel = parts.join(' • ');
    this.dialog.closeAll();
  }

  get totalAdults(): number {
    return this.roomsConfig.reduce((s, r) => s + r.adults, 0);
  }

  get totalChildren(): number {
    return this.roomsConfig.reduce((s, r) => s + r.children, 0);
  }

  get totalPeople(): number {
    return this.totalAdults + this.totalChildren;
  }

  private buildBookingQuery(selectedDate?: string | null): any {
    if (!this.detail) {
      return {};
    }
    const rooms = this.roomsConfig.length;
    const adults = this.roomsConfig.reduce((s, r) => s + r.adults, 0);
    const children = this.roomsConfig.reduce((s, r) => s + r.children, 0);
    const departure =
      this.leavingFrom || (this.departFrom.length ? this.departFrom[0] : null);
    let dateStr: string | null = null;
    if (selectedDate) {
      dateStr = selectedDate;
    } else if (this.leavingOn) {
      const y = this.leavingOn.getFullYear();
      const m = String(this.leavingOn.getMonth() + 1).padStart(2, '0');
      const d = String(this.leavingOn.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;
    } else if (this.groupDates.length) {
      dateStr = this.groupDates[0];
    }
    const query: any = {};
    if (departure) {
      query.departure = departure;
    }
    if (rooms > 0) {
      query.rooms = String(rooms);
    }
    if (adults >= 0) {
      query.adults = String(adults);
    }
    if (children >= 0) {
      query.children = String(children);
    }
    if (dateStr) {
      query.date = dateStr;
    }
    const childAges: number[] = [];
    this.roomsConfig.forEach((room) => {
      (room.childAges || []).forEach((age) => {
        if (typeof age === 'number' && !isNaN(age)) {
          childAges.push(age);
        }
      });
    });
    const extraBeds: string[] = [];
    this.roomsConfig.forEach((room) => {
      (room.extraBedFlags || []).forEach((flag) => {
        extraBeds.push(flag ? '1' : '0');
      });
    });
    const transportType =
      (this.transportationType && this.transportationType.trim()) || 'SIC';
    query.transportationType = transportType;
    if (childAges.length > 0) {
      query['child_ages[]'] = childAges.map((age) => String(age));
    }
    if (extraBeds.length > 0) {
      query['extra_beds[]'] = extraBeds;
    }
    if (transportType === 'Private') {
      this.updateVehicleCapacityError();
      if (this.vehicleSelectionError) {
        return {};
      }
      const vehiclesPayload: { id: number; qty: number }[] = [];
      Object.keys(this.selectedVehicles).forEach((key) => {
        const vid = Number(key);
        const qty = this.selectedVehicles[vid] || 0;
        if (vid > 0 && qty > 0) {
          vehiclesPayload.push({ id: vid, qty });
        }
      });
      if (vehiclesPayload.length === 0) {
        this.vehicleSelectionError = 'Please select at least one vehicle';
        return {};
      }
      query.vehicles = JSON.stringify(vehiclesPayload);
    } else {
      this.vehicleSelectionError = null;
      if (this.selectedVehicleId) {
        query.vehicle_id = String(this.selectedVehicleId);
      }
    }
    return query;
  }

  private updateVehicleCapacityError(): void {
    const t = (this.transportationType || 'SIC').trim();
    const totalPeople = this.totalPeople;
    if (t !== 'Private' || totalPeople <= 0) {
      this.vehicleSelectionError = null;
      return;
    }
    const capacity = this.getSelectedCapacity();
    if (capacity <= 0) {
      this.vehicleSelectionError = 'Please select at least one vehicle';
    } else if (capacity < totalPeople) {
      this.vehicleSelectionError =
        'Selected vehicles cannot accommodate all passengers';
      this.snackBar.open(
        'Selected vehicles cannot accommodate all passengers',
        'Close',
        { duration: 3000 }
      );
    } else {
      this.vehicleSelectionError = null;
    }
  }

  getSelectedCapacity(): number {
    let total = 0;
    const list = this.vehiclesByType('private');
    list.forEach((v) => {
      const qty = this.selectedVehicles[v.id] || 0;
      if (qty > 0) {
        total += qty * (v.max_occupancy || 0);
      }
    });
    return total;
  }

  get bookingSummary(): {
    pricePerAdult: number;
    totalAmount: number;
    netPrice: number;
    partnerMargin: number;
  } {
    const pricing: any = (this.detail as any)?.pricing || {};
    const rooms = this.roomsConfig.length || 1;
    const adultsCount = this.roomsConfig.reduce((s, r) => s + r.adults, 0);
    const adults = adultsCount > 0 ? adultsCount : rooms;
    const fromPrice =
      typeof this.detail?.fromPrice === 'number' ? this.detail.fromPrice : 0;
    const pricePerAdult =
      typeof pricing.totalPrice === 'number' && pricing.totalPrice > 0
        ? pricing.totalPrice
        : fromPrice;
    const hotelPrice =
      typeof pricing.hotelPrice === 'number' ? pricing.hotelPrice : 0;
    const vehiclePrice =
      typeof pricing.vehiclePrice === 'number' ? pricing.vehiclePrice : 0;
    const markup = typeof pricing.markup === 'number' ? pricing.markup : 0;
    const netPerAdult = hotelPrice + vehiclePrice;
    const marginPerAdult = markup;
    const totalAmount = pricePerAdult * adults;
    const netPrice = netPerAdult * adults;
    const partnerMargin = marginPerAdult * adults;
    return {
      pricePerAdult,
      totalAmount,
      netPrice,
      partnerMargin
    };
  }

  onBookNow(): void {
    if (!this.bookNowTpl) {
      return;
    }
    this.dialog.open(this.bookNowTpl, {
      width: '480px'
    });
  }

  onConfirmBookNow(): void {
    if (!this.detail) {
      return;
    }
    const query = this.buildBookingQuery();
    if (!query || Object.keys(query).length === 0) {
      return;
    }
    const qp = this.route.snapshot.queryParamMap;
    const selDayIds = qp.getAll('sel_day_ids[]');
    const selHotelIds = qp.getAll('sel_hotel_ids[]');
    const selRoomIds = qp.getAll('sel_room_ids[]');
    const selMealIds = qp.getAll('sel_meal_plan_ids[]');
    const summary = this.bookingSummary;
    const payload: any = {
      tour_id: this.detail.id ?? null,
      tour_name: (this.detail as any)?.name ?? null,
      nights: (this.detail as any)?.nights ?? null,
      departure: query.departure ?? null,
      date: query.date ?? null,
      rooms: Number(query.rooms ?? (this.roomsConfig.length || 1)),
      adults: Number(query.adults ?? this.totalAdults),
      children: Number(query.children ?? this.totalChildren),
      childAges: query['child_ages[]'] || [],
      extraBeds: query['extra_beds[]'] || [],
      transportationType: query.transportationType ?? null,
      vehicles: query.vehicles ? JSON.parse(String(query.vehicles)) : null,
      vehicle_id: query.vehicle_id ? Number(query.vehicle_id) : null,
      sel_day_ids: selDayIds && selDayIds.length ? selDayIds : [],
      sel_hotel_ids: selHotelIds && selHotelIds.length ? selHotelIds : [],
      sel_room_ids: selRoomIds && selRoomIds.length ? selRoomIds : [],
      sel_meal_plan_ids: selMealIds && selMealIds.length ? selMealIds : [],
      price_total: summary.totalAmount ?? null,
      price_per_adult: summary.pricePerAdult ?? null,
      net_price: summary.netPrice ?? null,
      partner_margin: summary.partnerMargin ?? null,
      photo_url:
        (this.detail as any)?.photo_url ||
        (this.detail as any)?.banner_image ||
        null
    };
    try {
      const raw = JSON.stringify(payload);
      localStorage.setItem('group_tour_booking_selection', raw);
    } catch {}
    this.dialog.closeAll();
    this.router.navigate(['/holiday/group-tour', this.detail.id, 'book-trip']);
  }

  onCheckAvailability(selectedDate?: string): void {
    if (!this.detail) {
      return;
    }
    const query = this.buildBookingQuery(selectedDate);
    if (!query || Object.keys(query).length === 0) {
      return;
    }
    this.canBook = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query,
      queryParamsHandling: 'merge'
    });
    const id = this.detail.id;
    setTimeout(() => {
      this.loadDetails(id, query, () => {
        this.canBook = true;
      });
    });
  }

  onApplyHotelSelection(dialogRef: any): void {
    const dayIndex = this.activeDayIndexForDialog;
    if (dayIndex === null || dayIndex === undefined) {
      dialogRef.close();
      return;
    }
    if (!this.detail || !Array.isArray(this.detail.days)) {
      dialogRef.close();
      return;
    }
    const day = this.detail.days[dayIndex];
    const dayId = (day as any).itinerary_day_id || null;
    const hotelId = this.daySelectedHotelId[dayIndex] || null;
    const roomId = this.daySelectedRoomId[dayIndex] || null;
    const mealPlanId: number | null = this.daySelectedMealId[dayIndex] || null;

    const qp = this.route.snapshot.queryParamMap;
    const existingDayIds = qp.getAll('sel_day_ids[]');
    const existingHotelIds = qp.getAll('sel_hotel_ids[]');
    const existingRoomIds = qp.getAll('sel_room_ids[]');
    const existingMealIds = qp.getAll('sel_meal_plan_ids[]');

    const newDayIds: string[] = [];
    const newHotelIds: string[] = [];
    const newRoomIds: string[] = [];
    const newMealIds: string[] = [];

    for (let i = 0; i < existingDayIds.length; i++) {
      const did = Number(existingDayIds[i] || 0) || 0;
      if (dayId && did === dayId) {
        continue;
      }
      newDayIds.push(existingDayIds[i]);
      newHotelIds.push(existingHotelIds[i] || '');
      newRoomIds.push(existingRoomIds[i] || '');
      newMealIds.push(existingMealIds[i] || '');
    }

    if (dayId && hotelId && roomId && mealPlanId) {
      newDayIds.push(String(dayId));
      newHotelIds.push(String(hotelId));
      newRoomIds.push(String(roomId));
      newMealIds.push(String(mealPlanId));
    }

    const bookingQuery = this.buildBookingQuery();
    if (!bookingQuery || Object.keys(bookingQuery).length === 0) {
      dialogRef.close();
      return;
    }

    const preservedParams: any = {};
    qp.keys.forEach((key) => {
      if (
        key === 'sel_day_ids[]' ||
        key === 'sel_hotel_ids[]' ||
        key === 'sel_room_ids[]' ||
        key === 'sel_meal_plan_ids[]'
      ) {
        return;
      }
      if (key in bookingQuery) {
        return;
      }
      const vals = qp.getAll(key);
      if (vals.length === 1) {
        preservedParams[key] = vals[0];
      } else if (vals.length > 1) {
        preservedParams[key] = vals;
      }
    });

    const queryParams: any = {
      ...preservedParams,
      ...bookingQuery,
      'sel_day_ids[]': newDayIds,
      'sel_hotel_ids[]': newHotelIds,
      'sel_room_ids[]': newRoomIds,
      'sel_meal_plan_ids[]': newMealIds
    };

    console.log('Selected day/hotel/room/meal:', {
      dayId,
      hotelId,
      roomId,
      mealPlanId,
      newDayIds,
      newHotelIds,
      newRoomIds,
      newMealIds,
      queryParams
    });

    this.canBook = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });

    const id = this.detail.id;
    setTimeout(() => {
      this.loadDetails(id, queryParams, () => {
        this.canBook = true;
      });
    });

    dialogRef.close({ dayIndex });
  }

  get hotelList(): GroupTourHotel[] {
    if (!this.detail || !Array.isArray(this.detail.days)) {
      return [];
    }
    const map = new Map<number, GroupTourHotel>();
    this.detail.days.forEach((day) => {
      if (!day || !Array.isArray(day.hotels) || day.hotels.length === 0) {
        return;
      }
      const def =
        day.hotels.find((h) => h && typeof h.id === 'number' && h.is_default) ||
        day.hotels[0];
      if (!def || typeof def.id !== 'number') {
        return;
      }
      if (!map.has(def.id)) {
        map.set(def.id, def);
      }
    });
    return Array.from(map.values());
  }

  resolvePhoto(url?: string | null): string | null {
    if (!url) {
      return null;
    }
    const trimmed = url.startsWith('/') ? url.substring(1) : url;
    return `${environment.imgUrl}/${trimmed}`;
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map((v) => Number(v));
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      return null;
    }
    return dt;
  }

  get vehicleList(): GroupTourVehicle[] {
    const detail = this.detail;
    if (!detail || !Array.isArray(detail.vehicles)) {
      return [];
    }
    return detail.vehicles as GroupTourVehicle[];
  }

  vehiclesByType(type: string): GroupTourVehicle[] {
    const t = type.toLowerCase();
    const list = this.vehicleList;
    return list.filter((v) => String(v.type || '').toLowerCase() === t);
  }

  incrementVehicle(vehicleId: number): void {
    const vid = Number(vehicleId) || 0;
    if (!vid) {
      return;
    }
    const current = this.selectedVehicles[vid] || 0;
    this.selectedVehicles = {
      ...this.selectedVehicles,
      [vid]: current + 1
    };
    this.updateVehicleCapacityError();
    this.canBook = false;
  }

  decrementVehicle(vehicleId: number): void {
    const vid = Number(vehicleId) || 0;
    if (!vid) {
      return;
    }
    const current = this.selectedVehicles[vid] || 0;
    if (current <= 0) {
      return;
    }
    if (current === 1) {
      const copy = { ...this.selectedVehicles };
      delete copy[vid];
      this.selectedVehicles = copy;
      this.updateVehicleCapacityError();
      this.canBook = false;
      return;
    }
    this.selectedVehicles = {
      ...this.selectedVehicles,
      [vid]: current - 1
    };
    this.updateVehicleCapacityError();
    this.canBook = false;
  }

  onSelectVehicle(vehicleId: number): void {
    const vid = Number(vehicleId) || 0;
    if (!vid) {
      return;
    }
    this.selectedVehicleId = vid;
    this.onCheckAvailability();
  }

  private initVehicleSelection(): void {
    const list = this.vehicleList;
    if (!list.length) {
      this.selectedVehicleId = null;
      this.selectedPrimaryPrivateVehicleId = null;
      return;
    }
    const t = (this.transportationType || 'SIC').toLowerCase();
    if (t === 'private') {
      const pricing: any = (this.detail as any)?.pricing || {};
      const vehiclePrices: any[] = Array.isArray(pricing.vehicle_prices)
        ? pricing.vehicle_prices
        : [];
      let defaultPrivateId: number | null = null;
      if (vehiclePrices.length) {
        const defaultVp =
          vehiclePrices.find(
            (p) =>
              String(p.type || '').toLowerCase() === 'private' &&
              (p.is_default === 1 ||
                p.is_default === '1' ||
                p.is_default === true)
          ) ||
          vehiclePrices.find(
            (p) => String(p.type || '').toLowerCase() === 'private'
          ) ||
          null;
        if (defaultVp && defaultVp.vehicle_id) {
          defaultPrivateId = Number(defaultVp.vehicle_id) || null;
        }
      }
      const privateList = list.filter((v) => {
        const tval = String(v.type || '').toLowerCase();
        return tval === 'private';
      });
      if (!privateList.length) {
        this.selectedPrimaryPrivateVehicleId = null;
      } else {
        let sel =
          (defaultPrivateId
            ? privateList.find((v) => Number(v.id) === defaultPrivateId) || null
            : null) ||
          privateList.find((v) => {
            const d = v.is_default;
            return d === 1 || d === '1' || d === true;
          }) ||
          null;
        if (!sel) {
          sel = privateList[0];
        }
        this.selectedPrimaryPrivateVehicleId = sel
          ? Number(sel.id) || null
          : null;
        if (sel && Object.keys(this.selectedVehicles).length === 0) {
          const vid = Number(sel.id) || 0;
          if (vid) {
            this.selectedVehicles = {
              [vid]: 1
            };
          }
        }
      }
      this.selectedVehicleId = null;
      return;
    }
    const qp = this.route.snapshot.queryParamMap;
    const routeVal = qp.get('vehicle_id') || qp.get('vehicleId');
    if (routeVal) {
      const vid = Number(routeVal);
      if (!Number.isNaN(vid)) {
        const fromRoute = list.find((v) => Number(v.id) === vid);
        if (fromRoute) {
          this.selectedVehicleId = vid;
          return;
        }
      }
    }
    const candidates = list.filter(
      (v) => String(v.type || '').toLowerCase() === t
    );
    let sel =
      candidates.find((v) => {
        const d = v.is_default;
        return d === 1 || d === '1' || d === true;
      }) || null;
    if (!sel && candidates.length) {
      sel = candidates[0];
    }
    this.selectedVehicleId = sel ? Number(sel.id) || null : null;
  }
}
