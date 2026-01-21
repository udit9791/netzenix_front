import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { environment } from '../../../../../environments/environment';
import {
  ActivityCartItem,
  ActivityCartService
} from 'src/app/core/services/activity-cart.service';

@Component({
  selector: 'vex-activity-detail',
  standalone: true,
  templateUrl: './activity-detail.component.html',
  styleUrls: ['./activity-detail.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDividerModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class ActivityDetailComponent implements OnInit {
  loading = true;
  error = '';
  activity: any = null;
  dates: any[] = [];
  images: string[] = [];
  primaryImage: string | null = null;
  galleryImages: string[] = [];
  imgBaseUrl: string = environment.imgUrl;
  sliderImages: string[] = [];
  activeSliderIndex = 0;
  @ViewChild('imageSliderTpl') imageSliderTpl!: TemplateRef<any>;
  @ViewChild('packageOptionsTpl') packageOptionsTpl!: TemplateRef<any>;
  availableDateKeys = new Set<string>();
  selectedDate: Date | null = null;
  selectedDateData: any | null = null;
  selectedSlotIndex: number | null = null;
  adultCount = 1;
  childCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog,
    private cartService: ActivityCartService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    if (!id || isNaN(id)) {
      this.error = 'Invalid activity';
      this.loading = false;
      return;
    }
    this.loadActivity(id);
  }

  private loadActivity(id: number): void {
    const apiUrl = environment.apiUrl;
    this.loading = true;
    this.error = '';
    this.http.get<any>(`${apiUrl}/activities/${id}`).subscribe({
      next: (res) => {
        const data = res?.data || res;
        this.activity = data?.activity || null;
        this.dates = Array.isArray(data?.dates) ? data.dates : [];
        this.rebuildAvailableDateKeys();
        const rawImages = Array.isArray(data?.images) ? data.images : [];
        const paths = rawImages
          .map((x: any) => x?.image_path || x?.url || x?.path || '')
          .filter((p: string) => !!p);
        const cover = this.activity?.cover_image || null;
        const coverUrl = cover ? this.fullImgUrl(cover) : null;
        const list: string[] = [];
        if (coverUrl) {
          list.push(coverUrl);
        }
        paths.forEach((p: string) => {
          const u = this.fullImgUrl(p);
          if (!list.includes(u)) {
            list.push(u);
          }
        });
        this.images = list;
        this.primaryImage = list.length ? list[0] : null;
        this.galleryImages = list.slice(1);
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load activity';
        this.loading = false;
      }
    });
  }

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

  get minPriceLabel(): string {
    const dates = Array.isArray(this.dates) ? this.dates : [];
    let min = Number.POSITIVE_INFINITY;
    dates.forEach((d: any) => {
      const p = d?.pricing || null;
      const adult = p?.adult_price != null ? Number(p.adult_price) : null;
      const child = p?.child_price != null ? Number(p.child_price) : null;
      const v =
        adult != null
          ? adult
          : child != null
            ? child
            : Number.POSITIVE_INFINITY;
      if (!isNaN(v) && v < min) {
        min = v;
      }
      const slots = Array.isArray(d?.time_slots) ? d.time_slots : [];
      slots.forEach((s: any) => {
        const sp = s?.pricing || null;
        const sa = sp?.adult_price != null ? Number(sp.adult_price) : null;
        const sc = sp?.child_price != null ? Number(sp.child_price) : null;
        const sv = sa != null ? sa : sc != null ? sc : Number.POSITIVE_INFINITY;
        if (!isNaN(sv) && sv < min) {
          min = sv;
        }
      });
    });
    if (!isFinite(min)) return '';
    return min.toFixed(0);
  }

  get hasTimeSlotFlag(): boolean {
    return !!this.activity?.has_time_slot;
  }

  get allowChild(): boolean {
    return !!this.activity?.allow_child;
  }

  get maxAdults(): number | null {
    const v = this.activity?.max_adults;
    return v !== undefined && v !== null ? Number(v) : null;
  }

  get maxChildren(): number | null {
    const v = this.activity?.max_children;
    return v !== undefined && v !== null ? Number(v) : null;
  }

  get totalSelected(): number {
    return this.adultCount + (this.allowChild ? this.childCount : 0);
  }

  get currentSlotCapacity(): number | null {
    if (!this.hasTimeSlotForSelectedDate) return null;
    const idx = this.selectedSlotIndex;
    if (idx === null || idx < 0) return null;
    const slots = this.getSlotsForSelectedDate();
    const slot = slots[idx];
    if (!slot) return null;
    const cap = slot.max_capacity;
    return cap !== undefined && cap !== null ? Number(cap) : null;
  }

  get isQuantityValid(): boolean {
    if (!this.selectedDate) return false;
    if (this.hasTimeSlotForSelectedDate && this.selectedSlotIndex === null) {
      return false;
    }
    if (this.totalSelected <= 0) return false;
    const maxA = this.maxAdults;
    if (maxA !== null && this.adultCount > maxA) return false;
    const maxC = this.maxChildren;
    if (this.allowChild && maxC !== null && this.childCount > maxC) {
      return false;
    }
    const cap = this.currentSlotCapacity;
    if (cap !== null && this.totalSelected > cap) {
      return false;
    }
    return true;
  }

  backToSearch(): void {
    this.router.navigate(['/activities/search']);
  }

  selectOptions(): void {
    if (!this.activity?.id) return;
    if (!this.packageOptionsTpl) return;
    if (!this.availableDateKeys.size) {
      this.rebuildAvailableDateKeys();
    }
    this.dialog.open(this.packageOptionsTpl, {
      panelClass: 'activity-package-options-dialog'
    });
  }

  openImageSlider(startIndex: number): void {
    if (!this.images || !this.images.length) return;
    this.sliderImages = this.images;
    const total = this.sliderImages.length;
    this.activeSliderIndex =
      startIndex >= 0 && startIndex < total ? startIndex : 0;
    if (!this.imageSliderTpl) return;
    this.dialog.open(this.imageSliderTpl, {
      panelClass: 'activity-image-slider-dialog'
    });
  }

  nextImage(): void {
    const total = this.sliderImages.length;
    if (!total) return;
    this.activeSliderIndex = (this.activeSliderIndex + 1) % total;
  }

  prevImage(): void {
    const total = this.sliderImages.length;
    if (!total) return;
    this.activeSliderIndex = (this.activeSliderIndex - 1 + total) % total;
  }

  closeImageSlider(): void {
    this.dialog.closeAll();
  }

  dateFilter = (date: Date | null): boolean => {
    if (!date) return false;
    const key = this.formatDateKey(date);
    return this.availableDateKeys.has(key);
  };

  getSlotsForSelectedDate(): any[] {
    const slots = this.selectedDateData?.time_slots;
    if (!Array.isArray(slots)) {
      return [];
    }
    return slots.filter((s: any) => {
      const cap = s?.max_capacity;
      if (cap === undefined || cap === null) {
        return true;
      }
      const n = Number(cap);
      return !isNaN(n) && n > 0;
    });
  }

  get hasTimeSlotForSelectedDate(): boolean {
    const slots = this.getSlotsForSelectedDate();
    return slots.length > 0;
  }

  onDateSelected(date: Date | null): void {
    this.selectedDate = date;
    this.selectedSlotIndex = null;
    this.adultCount = 1;
    this.childCount = 0;
    if (!date) {
      this.selectedDateData = null;
      return;
    }
    const key = this.formatDateKey(date);
    const list = Array.isArray(this.dates) ? this.dates : [];
    this.selectedDateData =
      list.find((d: any) => {
        const raw = d?.activity_date || d?.date;
        if (raw instanceof Date) {
          return this.formatDateKey(raw) === key;
        }
        if (typeof raw === 'string') {
          return raw.substring(0, 10) === key;
        }
        return false;
      }) || null;
  }

  selectSlot(index: number): void {
    this.selectedSlotIndex = index;
    this.adultCount = 1;
    this.childCount = 0;
  }

  formatSlotTime(value: string | null | undefined): string {
    if (!value) return '';
    if (value.length >= 5) {
      return value.substring(0, 5);
    }
    return value;
  }

  closePackageOptions(): void {
    this.dialog.closeAll();
  }

  confirmPackageSelection(): void {
    if (!this.isQuantityValid) return;
    if (!this.activity?.id) return;
    if (!this.selectedDate || !this.selectedDateData) return;

    const dateKey = this.formatDateKey(this.selectedDate);

    let slotId: number | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;
    let adultPrice: number | null = null;
    let childPrice: number | null = null;

    const basePricing = this.selectedDateData?.pricing || null;

    if (this.hasTimeSlotForSelectedDate && this.selectedSlotIndex !== null) {
      const slots = this.getSlotsForSelectedDate();
      const slot = slots[this.selectedSlotIndex] || null;
      if (slot) {
        slotId =
          slot.id !== undefined && slot.id !== null ? Number(slot.id) : null;
        startTime = slot.start_time || null;
        endTime = slot.end_time || null;
        const slotPricing = slot.pricing || basePricing || null;
        if (slotPricing) {
          adultPrice =
            slotPricing.adult_price !== undefined &&
            slotPricing.adult_price !== null
              ? Number(slotPricing.adult_price)
              : null;
          childPrice =
            slotPricing.child_price !== undefined &&
            slotPricing.child_price !== null
              ? Number(slotPricing.child_price)
              : null;
        }
      }
    } else if (basePricing) {
      adultPrice =
        basePricing.adult_price !== undefined &&
        basePricing.adult_price !== null
          ? Number(basePricing.adult_price)
          : null;
      childPrice =
        basePricing.child_price !== undefined &&
        basePricing.child_price !== null
          ? Number(basePricing.child_price)
          : null;
    }

    const existingItems = this.cartService.getItems();
    console.log('Activity cart items before add:', existingItems);

    const submittedPayload = {
      activityId: this.activity.id,
      date: dateKey,
      slotId,
      startTime,
      endTime,
      adults: this.adultCount,
      children: this.allowChild ? this.childCount : 0
    };
    console.log('Submitted activity cart payload:', submittedPayload);

    const duplicateFound = this.cartService.hasScheduleConflict(
      this.activity.id,
      dateKey,
      slotId,
      startTime,
      endTime
    );
    console.log('Duplicate schedule found:', duplicateFound);

    if (duplicateFound) {
      this.snackBar.open(
        'This activity for the selected date and time is already in your cart',
        'Close',
        { duration: 2000 }
      );
      return;
    }

    let totalPrice: number | null = null;
    if (adultPrice !== null || (this.allowChild && childPrice !== null)) {
      const adultTotal = adultPrice !== null ? this.adultCount * adultPrice : 0;
      const childTotal =
        this.allowChild && childPrice !== null
          ? this.childCount * childPrice
          : 0;
      totalPrice = adultTotal + childTotal;
    }

    const item: ActivityCartItem = {
      activityId: this.activity.id,
      title: this.activity.title || '',
      date: dateKey,
      hasTimeSlot: this.hasTimeSlotFlag && this.hasTimeSlotForSelectedDate,
      slotId,
      startTime,
      endTime,
      adults: this.adultCount,
      children: this.allowChild ? this.childCount : 0,
      adultPrice,
      childPrice,
      totalPrice,
      maxAdults: this.maxAdults,
      maxChildren: this.allowChild ? this.maxChildren : null
    };

    console.log('Final item to push in cart:', item);

    this.cartService.addItem(item);
    this.dialog.closeAll();
    this.snackBar.open('Added to cart', 'Close', {
      duration: 2000
    });
  }

  private rebuildAvailableDateKeys(): void {
    const list = Array.isArray(this.dates) ? this.dates : [];
    const keys: string[] = [];
    list.forEach((d: any) => {
      const raw = d?.activity_date || d?.date;
      let key: string | null = null;
      if (raw instanceof Date) {
        key = this.formatDateKey(raw);
      } else if (typeof raw === 'string' && raw) {
        key = raw.substring(0, 10);
      }
      if (!key) {
        return;
      }
      if (this.hasTimeSlotFlag) {
        const allSlots = Array.isArray(d?.time_slots) ? d.time_slots : [];
        const slotsWithCap = allSlots.filter((s: any) => {
          const cap = s?.max_capacity;
          if (cap === undefined || cap === null) {
            return true;
          }
          const n = Number(cap);
          return !isNaN(n) && n > 0;
        });
        if (!slotsWithCap.length) {
          return;
        }
      }
      keys.push(key);
    });
    this.availableDateKeys = new Set(keys);
  }

  incrementAdult(): void {
    if (!this.canIncreaseAdult()) return;
    this.adultCount++;
  }

  decrementAdult(): void {
    if (this.adultCount <= 0) return;
    this.adultCount--;
  }

  incrementChild(): void {
    if (!this.allowChild) return;
    if (!this.canIncreaseChild()) return;
    this.childCount++;
  }

  decrementChild(): void {
    if (this.childCount <= 0) return;
    this.childCount--;
  }

  private canIncreaseAdult(): boolean {
    const nextAdults = this.adultCount + 1;
    const maxA = this.maxAdults;
    if (maxA !== null && nextAdults > maxA) {
      return false;
    }
    const cap = this.currentSlotCapacity;
    const nextTotal = nextAdults + (this.allowChild ? this.childCount : 0);
    if (cap !== null && nextTotal > cap) {
      return false;
    }
    return true;
  }

  private canIncreaseChild(): boolean {
    const nextChildren = this.childCount + 1;
    const maxC = this.maxChildren;
    if (maxC !== null && nextChildren > maxC) {
      return false;
    }
    const cap = this.currentSlotCapacity;
    const nextTotal = this.adultCount + (this.allowChild ? nextChildren : 0);
    if (cap !== null && nextTotal > cap) {
      return false;
    }
    return true;
  }

  private formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
