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
      this.hotelService.getInventoryDates(id).subscribe({
        next: (res: any) => {
          const data = Array.isArray(res?.data) ? res.data : [];
          this.rooms = data;
          const arr = this.roomsFormArray();
          while (arr.length) arr.removeAt(0);
          for (const r of data) {
            const dates = this.fb.array([] as any);
            for (const d of r.dates || []) {
              (dates as any).push(
                this.fb.group({
                  date: [d.date],
                  no_of_room: [d.no_of_room]
                })
              );
            }
            arr.push(
              this.fb.group({
                room_id: [r.room_id],
                room_name: [r.room_name],
                dates
              })
            );
          }
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
}
