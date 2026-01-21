import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  AbstractControl
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { HotelOptionService } from '../../../../services/hotel-option.service';

@Component({
  selector: 'vex-update-pricing',
  templateUrl: './update-pricing.component.html',
  styleUrls: ['./update-pricing.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatCheckboxModule,
    MatButtonModule,
    RouterModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class UpdatePricingComponent implements OnInit {
  form!: FormGroup;
  inventoryId!: number;
  currentType: 'normal' | 'confirm' = 'normal';
  mealOptions: any[] = [];
  mealKeyItems: { key: string; label: string }[] = [];
  selectedRoomIds: number[] = [];
  occupancyKeysMap: Record<number, string[]> = {};
  roomNamesById: Record<number, string> = {};
  priceIdByRoom: Record<
    number,
    {
      weekDays: Record<string, Record<string, number>>;
      weekendDays: Record<string, Record<string, number>>;
    }
  > = {};
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService,
    private hotelOptionService: HotelOptionService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({ rooms: this.fb.array([]) });

    const idStr = this.route.snapshot.queryParamMap.get('inventory_id');
    this.inventoryId = idStr ? Number(idStr) : 0;

    this.hotelOptionService.getActiveOptions('meal_option').subscribe({
      next: (res: any) => {
        this.mealOptions = Array.isArray(res?.data) ? res.data : [];
        this.mealKeyItems = this.mealOptions.map((m: any) => ({
          key: String(m.id),
          label: m.name
        }));
        this.loadPricing(this.inventoryId);
      }
    });
  }

  loadPricing(id: number): void {
    this.hotelService.getInventoryPricing(id).subscribe({
      next: (res: any) => {
        const rooms = res?.data?.rooms || [];
        this.currentType =
          (res?.data?.type as any) ||
          (this.route.snapshot.queryParamMap.get('type') as any) ||
          'normal';
        (rooms || []).forEach((r: any) => {
          if (r && typeof r.room_id === 'number') {
            this.roomNamesById[r.room_id] = r.room_name || '';
            const wk: any = (r.grid && r.grid.week_days) || {};
            const we: any = (r.grid && r.grid.weekend_days) || {};
            const weekDaysIds: Record<string, Record<string, number>> = {};
            const weekendDaysIds: Record<string, Record<string, number>> = {};
            Object.keys(wk).forEach((rangeKey) => {
              const catMap = wk[rangeKey] || {};
              weekDaysIds[rangeKey] = {};
              Object.keys(catMap).forEach((catKey) => {
                const entry = catMap[catKey];
                const idVal =
                  entry && typeof entry === 'object'
                    ? Number(entry.id)
                    : undefined;
                if (idVal) weekDaysIds[rangeKey][catKey] = idVal;
              });
            });
            Object.keys(we).forEach((rangeKey) => {
              const catMap = we[rangeKey] || {};
              weekendDaysIds[rangeKey] = {};
              Object.keys(catMap).forEach((catKey) => {
                const entry = catMap[catKey];
                const idVal =
                  entry && typeof entry === 'object'
                    ? Number(entry.id)
                    : undefined;
                if (idVal) weekendDaysIds[rangeKey][catKey] = idVal;
              });
            });
            this.priceIdByRoom[r.room_id] = {
              weekDays: weekDaysIds,
              weekendDays: weekendDaysIds
            };
          }
        });
        this.buildRooms(rooms);
      }
    });
  }

  buildRooms(rooms: any[]): void {
    const arr = this.roomsFormArray();
    while (arr.length) arr.removeAt(0);

    for (const r of rooms) {
      const maxPersons = r.detail?.max_person || 1;
      this.occupancyKeysMap[r.room_id] = Array.from({ length: maxPersons }).map(
        (_, i) => `p${i + 1}`
      );

      const roomGroup = this.fb.group({
        room_id: [r.room_id],
        weekendDays: this.fb.array(
          (r.detail?.weekend_days || []).map((d: any) => this.fb.control(d))
        ),
        ranges: this.fb.array([])
      });

      const rangesArr = roomGroup.get('ranges') as FormArray;

      // Create date range form groups
      for (const rg of r.ranges) {
        const frm = this.fb.group({
          from: [rg.start_date],
          to: [rg.end_date],
          prices: this.createInitialPricesForCount(maxPersons)
        });

        rangesArr.push(frm);
      }

      // Load prices from GRID (weekdays + weekends)
      if (r.grid) {
        this.applyGridValues(roomGroup, r.grid);
      }

      arr.push(roomGroup);
      this.selectedRoomIds.push(r.room_id);
    }
  }

  /* ---------------- Helpers ---------------- */

  roomsFormArray(): FormArray<FormGroup> {
    return this.form.get('rooms') as FormArray<FormGroup>;
  }

  getRoomGroup(roomId: number): FormGroup {
    return this.roomsFormArray().controls.find(
      (g: any) => Number(g.get('room_id')?.value) === Number(roomId)
    ) as FormGroup;
  }

  getDateRanges(roomId: number): FormArray<FormGroup> {
    return this.getRoomGroup(roomId).get('ranges') as FormArray<FormGroup>;
  }

  normalizeDateStr(v: any): string {
    if (v === null || v === undefined || v === '') return '';
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return String(v ?? '');
    return dt.toISOString().slice(0, 10);
  }

  /* ---------------- Meal Keys ---------------- */

  toMealKey(label: string): string {
    return label
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
  }

  mealKeys(): { key: string; label: string }[] {
    return this.mealKeyItems;
  }

  createMealPricesGroup(): FormGroup {
    const g = this.fb.group({});
    this.mealKeys().forEach((m) =>
      g.addControl(String(m.key), this.fb.control(null))
    );
    return g;
  }

  createInitialPricesForCount(count: number): FormGroup {
    const weekdayGroup = this.fb.group({});
    const weekendGroup = this.fb.group({});

    for (let i = 1; i <= count; i++) {
      weekdayGroup.addControl(`p${i}`, this.createMealPricesGroup());
      weekendGroup.addControl(`p${i}`, this.createMealPricesGroup());
    }

    return this.fb.group({
      weekday: weekdayGroup,
      weekend: weekendGroup
    });
  }

  /* ---------------- GRID → UI MAPPING ---------------- */

  applyGridValues(roomGroup: FormGroup, grid: any): void {
    const rangesArr = roomGroup.get('ranges') as FormArray;

    for (const rgCtrl of rangesArr.controls) {
      const rg = rgCtrl as FormGroup;

      const from = this.normalizeDateStr(rg.get('from')?.value);
      const to = this.normalizeDateStr(rg.get('to')?.value);
      const key = `${from}|${to}`;

      const weekdayData = grid.week_days?.[key] || {};
      const weekendData = grid.weekend_days?.[key] || {};

      this.fillPricesForType(rg, weekdayData, 'weekday');
      this.fillPricesForType(rg, weekendData, 'weekend');
    }
  }

  fillPricesForType(
    rangeGroup: FormGroup,
    priceMap: any,
    type: 'weekday' | 'weekend'
  ): void {
    const priceGroup = rangeGroup.get('prices')?.get(type) as FormGroup;
    if (!priceGroup) return;

    Object.keys(priceMap).forEach((key) => {
      const entry = priceMap[key];
      const amount = entry && typeof entry === 'object' ? entry.amount : entry;
      const [personStr, mealType] = key.split(' - ');
      const occKey = `p${Number(personStr.trim())}`;
      const mealKey = mealType.trim();

      const occGroup = priceGroup.get(occKey) as FormGroup;
      if (!occGroup) return;
      const ctrl = occGroup.get(mealKey) as FormControl;
      if (ctrl) ctrl.setValue(amount);
    });
  }

  /* ---------------- Weekend Day Functions ---------------- */

  getWeekendDays(roomId: number): FormArray {
    const grp = this.getRoomGroup(roomId);
    return grp.get('weekendDays') as FormArray;
  }

  toggleWeekendDay(roomId: number, day: string, checked: boolean): void {
    const arr = this.getWeekendDays(roomId);
    const idx = arr.value.indexOf(day);

    if (checked && idx === -1) {
      arr.push(new FormControl(day));
    } else if (!checked && idx > -1) {
      arr.removeAt(idx);
    }
  }

  hasWeekend(roomId: number): boolean {
    return this.getWeekendDays(roomId).length > 0;
  }

  /* ---------------- Occupancy Keys ---------------- */

  occupancyKeysFor(roomId: number): string[] {
    return this.occupancyKeysMap[roomId] || [];
  }

  trackByRangeKey(index: number, rg: AbstractControl): string {
    const g = rg as FormGroup;
    const normalize = (v: any) => {
      const dt = new Date(v);
      if (isNaN(dt.getTime())) return String(v ?? '');
      return dt.toISOString().slice(0, 10);
    };
    const from = normalize(g.get('from')?.value);
    const to = normalize(g.get('to')?.value);
    return `${from}|${to}`;
  }

  trackByMealKey(index: number, mk: { key: string; label: string }): string {
    return mk.key;
  }

  trackByOccKey(index: number, key: string): string {
    return key;
  }

  asFormGroup(ctrl: any): FormGroup {
    return ctrl as FormGroup;
  }

  roomNameFor(roomId: number): string {
    return this.roomNamesById[roomId] || '';
  }

  save() {
    if (this.saving) return;
    this.saving = true;
    const payload = { details: this.buildDetailsPayload() };
    this.hotelService
      .updateInventoryPricing(this.inventoryId, payload)
      .subscribe({
        next: (res: any) => {
          this.saving = false;
          const t =
            (res && res.data && res.data.type) ||
            this.route.snapshot.queryParamMap.get('type') ||
            'normal';
          this.router.navigate(['/sale/hotel-inventory-management'], {
            queryParams: { type: t }
          });
        },
        error: () => {
          this.saving = false;
        }
      });
  }

  cancel() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  buildDetailsPayload(): Array<{
    id?: number;
    room_id: number;
    start_date: string | null;
    end_date: string | null;
    person: number;
    meal_type: number;
    amount: number;
    type: 'week_days' | 'weekend_days';
  }> {
    const out: any[] = [];
    for (const rid of this.selectedRoomIds) {
      const occKeys = this.occupancyKeysFor(rid);
      const ranges = this.getDateRanges(rid).controls as FormGroup[];
      for (const occKey of occKeys) {
        const person = Number(String(occKey).replace(/^p/, '')) || 1;
        for (const m of this.mealKeyItems) {
          const mealId = Number(m.key);
          for (const rg of ranges) {
            const from = rg.get('from')?.value;
            const to = rg.get('to')?.value;
            const rangeKey = `${this.normalizeDateStr(from)}|${this.normalizeDateStr(to)}`;
            const prices = rg.get('prices') as FormGroup;
            const wk = prices.get('weekday') as FormGroup;
            const we = prices.get('weekend') as FormGroup;
            const occWk = wk?.get(occKey) as FormGroup;
            const occWe = we?.get(occKey) as FormGroup;
            const vWk = occWk?.get(String(mealId)) as FormControl;
            const vWe = occWe?.get(String(mealId)) as FormControl;
            const catKey = `${person} - ${mealId}`;
            const idWk =
              (this.priceIdByRoom[rid]?.weekDays?.[rangeKey] || {})[catKey] ||
              undefined;
            const idWe =
              (this.priceIdByRoom[rid]?.weekendDays?.[rangeKey] || {})[
                catKey
              ] || undefined;
            const isConfirm = this.currentType === 'confirm';
            const startVal = isConfirm ? this.normalizeDateStr(from) : null;
            const endVal = isConfirm ? this.normalizeDateStr(to) : null;
            if (vWk && vWk.value !== null && vWk.value !== '') {
              out.push({
                id: idWk,
                room_id: rid,
                start_date: startVal,
                end_date: endVal,
                person,
                meal_type: mealId,
                amount: Number(vWk.value),
                type: 'week_days'
              });
            }
            if (vWe && vWe.value !== null && vWe.value !== '') {
              out.push({
                id: idWe,
                room_id: rid,
                start_date: startVal,
                end_date: endVal,
                person,
                meal_type: mealId,
                amount: Number(vWe.value),
                type: 'weekend_days'
              });
            }
          }
        }
      }
    }
    return out;
  }
}
