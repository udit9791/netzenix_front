import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  AbstractControl
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatDatepickerModule,
  MatDateRangePicker
} from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HotelService } from '../../../../services/hotel.service';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';

@Component({
  selector: 'vex-edit-date-inventory',
  templateUrl: './edit-date-inventory.component.html',
  styleUrls: ['./edit-date-inventory.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    RouterModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class EditDateInventoryComponent implements OnInit {
  form!: FormGroup;
  inventoryId!: number;
  rooms: any[] = [];
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({ rooms: this.fb.array([]) });
    const idStr = this.route.snapshot.queryParamMap.get('inventory_id');
    const id = idStr ? Number(idStr) : 0;
    this.inventoryId = id;
    if (id) {
      this.hotelService.getHotelInventoryById(id).subscribe({
        next: (res: any) => {
          const payload = res?.data ?? res;
          const rooms = Array.isArray(payload?.rooms) ? payload.rooms : [];
          this.rooms = rooms;
          const arr = this.roomsFormArray();
          while (arr.length) {
            arr.removeAt(0);
          }
          rooms.forEach((r: any) => {
            const datesFa = this.fb.array([] as any);
            (Array.isArray(r.dates) ? r.dates : []).forEach((d: any) => {
              (datesFa as any).push(
                this.fb.group({
                  date: [d.date],
                  no_of_room: [d.no_of_room]
                })
              );
            });
            arr.push(
              this.fb.group({
                room_id: [r.room_id],
                room_name: [r.room_name || r.room_description || ''],
                rangeStart: [null],
                rangeEnd: [null],
                dates: datesFa
              })
            );
          });
        },
        error: () => {}
      });
    }
  }

  roomsFormArray(): FormArray {
    return this.form.get('rooms') as FormArray;
  }

  asFormGroup(ctrl: any): FormGroup {
    return ctrl as FormGroup;
  }

  save(): void {
    const payload: any = { dates: [] };
    const arr = this.roomsFormArray();
    for (const roomCtrl of arr.controls) {
      const g = roomCtrl as FormGroup;
      const roomId = Number(g.get('room_id')?.value || 0);
      const dates = (g.get('dates') as FormArray).controls;
      for (const dCtrl of dates) {
        const dg = dCtrl as FormGroup;
        payload.dates.push({
          room_id: roomId,
          date: dg.get('date')?.value,
          no_of_room: Number(dg.get('no_of_room')?.value || 0)
        });
      }
    }
    this.saving = true;
    this.hotelService
      .updateInventoryDates(this.inventoryId, payload)
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

  cancel(): void {
    this.router.navigate(['/sale/hotel-inventory-management']);
  }

  datesControls(roomCtrl: AbstractControl): AbstractControl[] {
    const g = roomCtrl as FormGroup;
    const arr = g.get('dates') as FormArray;
    return arr ? arr.controls : [];
  }

  noOfRoomControl(dCtrl: AbstractControl): FormControl {
    return (dCtrl as FormGroup).get('no_of_room') as FormControl;
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

  addDatesRange(
    roomCtrl: AbstractControl,
    picker?: MatDateRangePicker<Date>
  ): void {
    const g = roomCtrl as FormGroup;
    const start = g.get('rangeStart')?.value;
    const end = g.get('rangeEnd')?.value;
    if (!start || !end) {
      if (picker) picker.open();
      return;
    }
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return;
    }
    if (startDate > endDate) {
      return;
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const datesArr = g.get('dates') as FormArray;
    const existing = new Set(
      (datesArr?.controls || []).map((c) =>
        String((c as FormGroup).get('date')?.value)
      )
    );
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const ds = this.dateToStr(cur);
      if (!existing.has(ds)) {
        datesArr.push(
          this.fb.group({
            date: [ds],
            no_of_room: [0]
          })
        );
        existing.add(ds);
      }
      cur.setDate(cur.getDate() + 1);
    }
    g.patchValue({ rangeStart: null, rangeEnd: null });
    if (picker) picker.close();
  }

  onRangeSelected(index: number, picker?: MatDateRangePicker<Date>): void {
    const arr = this.roomsFormArray();
    if (index < 0 || index >= arr.length) {
      return;
    }
    const grp = arr.at(index) as FormGroup;
    const start = grp.get('rangeStart')?.value;
    const end = grp.get('rangeEnd')?.value;
    if (start && end) {
      this.addDatesRange(grp, picker);
    }
  }
}
