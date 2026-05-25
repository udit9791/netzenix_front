import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { environment } from 'src/environments/environment';
import {
  ActivityCartItem,
  ActivityCartService
} from 'src/app/core/services/activity-cart.service';
import { ActivityService } from 'src/app/core/services/activity.service';

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
    MatExpansionModule,
    MatChipsModule,
    MatTabsModule,
    MatSnackBarModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivityDetailComponent implements OnInit {
  loading = true;
  error = '';
  activity: any = null;
  dates: any[] = [];
  inclusions: any[] = [];
  exclusions: any[] = [];
  faqs: any[] = [];
  images: string[] = [];
  primaryImage: string | null = null;
  galleryImages: string[] = [];
  imgBaseUrl = environment.imgUrl;

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

  /** Live capacity remaining for the selected (date, slot). null = uncapped. -1 = not yet checked. */
  liveCapacityLeft: number | null = -1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private cartService: ActivityCartService,
    private activityService: ActivityService,
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
    this.loading = true;
    this.error = '';
    this.activityService.get(id).subscribe({
      next: (data) => {
        this.activity = data?.activity || null;
        this.dates = Array.isArray(data?.dates) ? data.dates : [];
        this.inclusions = Array.isArray(data?.inclusions) ? data.inclusions : [];
        this.exclusions = Array.isArray(data?.exclusions) ? data.exclusions : [];
        this.faqs = Array.isArray(data?.faqs) ? data.faqs : [];
        this.rebuildAvailableDateKeys();
        const rawImages = Array.isArray(data?.images) ? data.images : [];
        const paths = rawImages
          .map((x: any) => x?.image_path || x?.url || x?.path || '')
          .filter((p: string) => !!p);
        const cover = this.activity?.cover_image || null;
        const list: string[] = [];
        if (cover) list.push(this.fullImgUrl(cover));
        paths.forEach((p: string) => {
          const u = this.fullImgUrl(p);
          if (!list.includes(u)) list.push(u);
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
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const base = (this.imgBaseUrl || '').replace(/\/$/, '');
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${base}/${p}`;
  }

  /* ---------- short description bullets ---------- */
  get highlightLines(): string[] {
    const raw = (this.activity?.short_description || '').toString();
    if (!raw.trim()) return [];
    return raw
      .split(/\r?\n/)
      .map((s: string) => s.trim().replace(/^[-•*]\s*/, ''))
      .filter((s: string) => !!s);
  }

  durationLabel(): string {
    const m = Number(this.activity?.duration_minutes || 0);
    if (!m || m <= 0) return '';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }

  /* ---------- min price ---------- */
  get minPriceLabel(): string {
    const dates = Array.isArray(this.dates) ? this.dates : [];
    let min = Number.POSITIVE_INFINITY;
    dates.forEach((d: any) => {
      const p = d?.pricing || null;
      const adult = p?.adult_price != null ? Number(p.adult_price) : null;
      const child = p?.child_price != null ? Number(p.child_price) : null;
      const v = adult ?? child ?? Number.POSITIVE_INFINITY;
      if (!isNaN(v) && v < min) min = v;
      const slots = Array.isArray(d?.time_slots) ? d.time_slots : [];
      slots.forEach((s: any) => {
        const sp = s?.pricing || null;
        const sa = sp?.adult_price != null ? Number(sp.adult_price) : null;
        const sc = sp?.child_price != null ? Number(sp.child_price) : null;
        const sv = sa ?? sc ?? Number.POSITIVE_INFINITY;
        if (!isNaN(sv) && sv < min) min = sv;
      });
    });
    return isFinite(min) ? min.toFixed(0) : '';
  }

  get hasTimeSlotFlag(): boolean {
    return !!this.activity?.has_time_slot;
  }
  get allowChild(): boolean {
    return !!this.activity?.allow_child;
  }
  get maxAdults(): number | null {
    const v = this.activity?.max_adults;
    return v != null ? Number(v) : null;
  }
  get maxChildren(): number | null {
    const v = this.activity?.max_children;
    return v != null ? Number(v) : null;
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
    return slot.max_capacity != null ? Number(slot.max_capacity) : null;
  }
  get isQuantityValid(): boolean {
    if (!this.selectedDate) return false;
    if (this.hasTimeSlotForSelectedDate && this.selectedSlotIndex === null) return false;
    if (this.totalSelected <= 0) return false;
    const maxA = this.maxAdults;
    if (maxA !== null && this.adultCount > maxA) return false;
    const maxC = this.maxChildren;
    if (this.allowChild && maxC !== null && this.childCount > maxC) return false;
    const cap = this.currentSlotCapacity;
    if (cap !== null && this.totalSelected > cap) return false;
    return true;
  }

  /* ---------- price preview ---------- */
  get previewAdultPrice(): number | null {
    if (this.hasTimeSlotForSelectedDate && this.selectedSlotIndex !== null) {
      const slot = this.getSlotsForSelectedDate()[this.selectedSlotIndex];
      const p = slot?.pricing?.adult_price ?? this.selectedDateData?.pricing?.adult_price;
      return p != null ? Number(p) : null;
    }
    const p = this.selectedDateData?.pricing?.adult_price;
    return p != null ? Number(p) : null;
  }
  get previewChildPrice(): number | null {
    if (this.hasTimeSlotForSelectedDate && this.selectedSlotIndex !== null) {
      const slot = this.getSlotsForSelectedDate()[this.selectedSlotIndex];
      const p = slot?.pricing?.child_price ?? this.selectedDateData?.pricing?.child_price;
      return p != null ? Number(p) : null;
    }
    const p = this.selectedDateData?.pricing?.child_price;
    return p != null ? Number(p) : null;
  }
  get previewTotal(): number | null {
    const a = this.previewAdultPrice;
    const c = this.previewChildPrice;
    if (a == null && c == null) return null;
    const adultTotal = a != null ? a * this.adultCount : 0;
    const childTotal = this.allowChild && c != null ? c * this.childCount : 0;
    return adultTotal + childTotal;
  }

  backToSearch(): void {
    this.router.navigate(['/activities/search']);
  }

  selectOptions(): void {
    if (!this.activity?.id || !this.packageOptionsTpl) return;
    if (!this.availableDateKeys.size) this.rebuildAvailableDateKeys();
    this.dialog.open(this.packageOptionsTpl, {
      panelClass: 'activity-package-options-dialog'
    });
  }

  openImageSlider(startIndex: number): void {
    if (!this.images?.length || !this.imageSliderTpl) return;
    this.sliderImages = this.images;
    const total = this.sliderImages.length;
    this.activeSliderIndex = startIndex >= 0 && startIndex < total ? startIndex : 0;
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
    return this.availableDateKeys.has(this.formatDateKey(date));
  };

  getSlotsForSelectedDate(): any[] {
    const slots = this.selectedDateData?.time_slots;
    if (!Array.isArray(slots)) return [];
    return slots.filter((s: any) => {
      const cap = s?.max_capacity;
      if (cap == null) return true;
      const n = Number(cap);
      return !isNaN(n) && n > 0;
    });
  }

  get hasTimeSlotForSelectedDate(): boolean {
    return this.getSlotsForSelectedDate().length > 0;
  }

  onDateSelected(date: Date | null): void {
    this.selectedDate = date;
    this.selectedSlotIndex = null;
    this.adultCount = 1;
    this.childCount = 0;
    this.liveCapacityLeft = -1;
    if (!date) {
      this.selectedDateData = null;
      return;
    }
    const key = this.formatDateKey(date);
    const list = Array.isArray(this.dates) ? this.dates : [];
    this.selectedDateData = list.find((d: any) => {
      const raw = d?.activity_date || d?.date;
      if (raw instanceof Date) return this.formatDateKey(raw) === key;
      if (typeof raw === 'string') return raw.substring(0, 10) === key;
      return false;
    }) || null;
    if (this.selectedDateData && !this.hasTimeSlotForSelectedDate) {
      this.refreshLiveCapacity();
    }
  }

  selectSlot(index: number): void {
    this.selectedSlotIndex = index;
    this.adultCount = 1;
    this.childCount = 0;
    this.refreshLiveCapacity();
  }

  private refreshLiveCapacity(): void {
    if (!this.activity?.id || !this.selectedDate) {
      this.liveCapacityLeft = -1;
      return;
    }
    const slotId =
      this.hasTimeSlotForSelectedDate && this.selectedSlotIndex !== null
        ? this.getSlotsForSelectedDate()[this.selectedSlotIndex]?.id ?? null
        : null;
    this.liveCapacityLeft = -1;
    this.activityService
      .checkCapacity({
        activity_id: this.activity.id,
        activity_date: this.formatDateKey(this.selectedDate),
        time_slot_id: slotId,
        session_token: this.cartService.getSessionToken()
      })
      .subscribe({
        next: (r) => {
          this.liveCapacityLeft = r?.capacity_left ?? null;
        },
        error: () => {
          this.liveCapacityLeft = null; // treat as unknown
        }
      });
  }

  formatSlotTime(value: string | null | undefined): string {
    if (!value) return '';
    return value.length >= 5 ? value.substring(0, 5) : value;
  }

  closePackageOptions(): void {
    this.dialog.closeAll();
  }

  confirmPackageSelection(addToCart: boolean = true): void {
    if (!this.isQuantityValid || !this.activity?.id) return;
    if (!this.selectedDate || !this.selectedDateData) return;

    const dateKey = this.formatDateKey(this.selectedDate);

    let slotId: number | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;
    let adultPrice: number | null = null;
    let childPrice: number | null = null;

    const basePricing = this.selectedDateData?.pricing || null;

    if (this.hasTimeSlotForSelectedDate && this.selectedSlotIndex !== null) {
      const slot = this.getSlotsForSelectedDate()[this.selectedSlotIndex] || null;
      if (slot) {
        slotId = slot.id != null ? Number(slot.id) : null;
        startTime = slot.start_time || null;
        endTime = slot.end_time || null;
        const sp = slot.pricing || basePricing || null;
        if (sp) {
          adultPrice = sp.adult_price != null ? Number(sp.adult_price) : null;
          childPrice = sp.child_price != null ? Number(sp.child_price) : null;
        }
      }
    } else if (basePricing) {
      adultPrice = basePricing.adult_price != null ? Number(basePricing.adult_price) : null;
      childPrice = basePricing.child_price != null ? Number(basePricing.child_price) : null;
    }

    if (
      this.cartService.hasScheduleConflict(this.activity.id, dateKey, slotId, startTime, endTime)
    ) {
      this.snackBar.open(
        'This activity for the selected date and time is already in your cart',
        'Close',
        { duration: 2500 }
      );
      return;
    }

    let totalPrice: number | null = null;
    if (adultPrice !== null || (this.allowChild && childPrice !== null)) {
      const at = adultPrice !== null ? this.adultCount * adultPrice : 0;
      const ct = this.allowChild && childPrice !== null ? this.childCount * childPrice : 0;
      totalPrice = at + ct;
    }

    const qty = this.adultCount + (this.allowChild ? this.childCount : 0);

    // First, try to soft-lock inventory on the backend. If the slot is uncapped, lock_id will still
    // be returned (server side) but capacity_left will be null — we treat that as success.
    this.activityService
      .lockInventory({
        activity_id: this.activity.id,
        activity_date: dateKey,
        time_slot_id: slotId,
        qty,
        session_token: this.cartService.getSessionToken()
      })
      .subscribe({
        next: (lock) => {
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
            maxChildren: this.allowChild ? this.maxChildren : null,
            coverImage: this.activity.cover_image
              ? this.fullImgUrl(this.activity.cover_image)
              : this.primaryImage,
            shortDescription: this.activity.short_description || null,
            cityName:
              this.activity.city_name ||
              this.activity.state_name ||
              this.activity.country_name ||
              null,
            lockId: lock?.lock_id ?? null,
            lockExpiresAt: lock?.expires_at ?? null
          };
          this.cartService.addItem(item);
          this.dialog.closeAll();
          this.snackBar.open('Added to cart', 'Close', { duration: 2000 });
          if (!addToCart) {
            this.router.navigate(['/activities/cart']);
          }
        },
        error: (err) => {
          const left = err?.error?.data?.capacity_left;
          const msg =
            left != null && left >= 0
              ? `Only ${left} spot${left === 1 ? '' : 's'} left for this slot`
              : 'This slot is no longer available';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
      });
  }

  bookNow(): void {
    this.confirmPackageSelection(false);
    this.router.navigate(['/activities/cart']);
  }

  private rebuildAvailableDateKeys(): void {
    const list = Array.isArray(this.dates) ? this.dates : [];
    const keys: string[] = [];
    list.forEach((d: any) => {
      const raw = d?.activity_date || d?.date;
      let key: string | null = null;
      if (raw instanceof Date) key = this.formatDateKey(raw);
      else if (typeof raw === 'string' && raw) key = raw.substring(0, 10);
      if (!key) return;
      if (this.hasTimeSlotFlag) {
        const all = Array.isArray(d?.time_slots) ? d.time_slots : [];
        const valid = all.filter((s: any) => {
          const cap = s?.max_capacity;
          if (cap == null) return true;
          const n = Number(cap);
          return !isNaN(n) && n > 0;
        });
        if (!valid.length) return;
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
    if (!this.allowChild || !this.canIncreaseChild()) return;
    this.childCount++;
  }
  decrementChild(): void {
    if (this.childCount <= 0) return;
    this.childCount--;
  }

  private canIncreaseAdult(): boolean {
    const next = this.adultCount + 1;
    const maxA = this.maxAdults;
    if (maxA !== null && next > maxA) return false;
    const cap = this.currentSlotCapacity;
    const total = next + (this.allowChild ? this.childCount : 0);
    if (cap !== null && total > cap) return false;
    return true;
  }
  private canIncreaseChild(): boolean {
    const next = this.childCount + 1;
    const maxC = this.maxChildren;
    if (maxC !== null && next > maxC) return false;
    const cap = this.currentSlotCapacity;
    const total = this.adultCount + (this.allowChild ? next : 0);
    if (cap !== null && total > cap) return false;
    return true;
  }

  private formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
