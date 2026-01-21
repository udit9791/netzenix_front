import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import {
  Observable,
  of,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap
} from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { HotelService } from '../../../../services/hotel.service';
import { HotelAccessService } from '../../../../services/hotel-access.service';

interface DialogData {
  isMaster?: boolean;
  tenantId?: number;
}

@Component({
  selector: 'vex-assign-hotel-access-dialog',
  standalone: true,
  templateUrl: './assign-hotel-access-dialog.component.html',
  styleUrls: ['./assign-hotel-access-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ]
})
export class AssignHotelAccessDialogComponent implements OnInit {
  userCtrl = new FormControl('', Validators.required);
  hotelQueryCtrl = new FormControl('');
  countryCtrl = new FormControl<number | null>(null);
  stateCtrl = new FormControl<number | null>({ value: null, disabled: true });
  cityCtrl = new FormControl<number | null>({ value: null, disabled: true });
  tenantCtrl = new FormControl<number | null>(null);

  filteredUsers$: Observable<any[]> = of([]);
  filteredHotels$: Observable<any[]> = of([]);

  selectedHotels: Array<{ id: number; name: string }> = [];

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  selectedCountryId: number | null = null;
  selectedStateId: number | null = null;
  selectedCityId: number | null = null;
  tenantOptions: Array<{ id: number; name: string }> = [];

  isMaster: boolean = false;
  tenantId: number | undefined;

  constructor(
    private dialogRef: MatDialogRef<AssignHotelAccessDialogComponent>,
    private userService: UserService,
    private hotelService: HotelService,
    private hotelAccessService: HotelAccessService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.isMaster = !!data?.isMaster;
    this.tenantId =
      data?.tenantId !== undefined && data?.tenantId !== null
        ? Number(data.tenantId)
        : undefined;
  }

  ngOnInit(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
    if (this.isMaster) {
      this.userService.getTenants(true).subscribe({
        next: (res: any) => {
          const data = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.tenantOptions = data
            .map((t: any) => ({
              id: Number(t.id),
              name: String(t.name || `Tenant #${t.id}`)
            }))
            .filter(
              (t: { id: number; name: string }) => t.id > 0 && t.name !== ''
            );
          this.tenantCtrl.setValue(this.tenantId ?? null);
        },
        error: () => {
          this.tenantOptions = [];
        }
      });
    }

    this.filteredUsers$ = this.userCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const query = String(q || '').trim();
        if (!query) return of([]);
        const tid = this.isMaster ? this.tenantId : undefined;
        return this.userService
          .getUsersForAutocomplete(query, undefined, tid)
          .pipe(
            map((res: any) => {
              const rows = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res)
                  ? res
                  : [];
              return rows
                .filter((u: any) => {
                  const active =
                    u.is_active === 1 ||
                    u.is_active === true ||
                    u.status === 'active';
                  return active;
                })
                .map((u: any) => ({
                  id: u.id,
                  label:
                    [u.name, u.email].filter((x: any) => !!x).join(' ') ||
                    `User #${u.id}`
                }));
            })
          );
      })
    );

    this.filteredHotels$ = this.hotelQueryCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const query = String(q || '').trim();
        if (
          !query ||
          !this.selectedCountryId ||
          !this.selectedStateId ||
          !this.selectedCityId
        )
          return of([]);
        const cityId = this.selectedCityId ?? undefined;
        const stateId = this.selectedStateId ?? undefined;
        const countryId = this.selectedCountryId ?? undefined;
        const tid = this.isMaster ? this.tenantId : undefined;
        return this.hotelService
          .searchUnassignedHotels(query, 10, cityId, stateId, countryId, tid)
          .pipe(
            map((res: any) => {
              const rows = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res)
                  ? res
                  : [];
              return rows.map((h: any) => ({
                id: h.id,
                label: h.name || h.hotel_name || ''
              }));
            })
          );
      })
    );

    this.countryCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id: number | null) => this.onCountryChange(Number(id || 0)));
    this.stateCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id: number | null) => this.onStateChange(Number(id || 0)));
    this.cityCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id: number | null) => this.onCityChange(Number(id || 0)));
    if (this.isMaster) {
      this.tenantCtrl.valueChanges
        .pipe(debounceTime(150))
        .subscribe((id: number | null) => this.onTenantChange(Number(id || 0)));
    }
  }

  displayUser(u: any): string {
    if (!u) return '';
    const label =
      u.label ||
      [u.name, u.email].filter((x: any) => !!x).join(' ') ||
      (u.id ? `User #${u.id}` : '');
    return String(label || '');
  }

  displayHotel(h: any): string {
    if (!h) return '';
    const label =
      h.label || h.name || h.hotel_name || (h.id ? `Hotel #${h.id}` : '');
    return String(label || '');
  }

  onCountryChange(countryId: number): void {
    this.selectedCountryId = countryId || null;
    this.states = [];
    this.cities = [];
    this.selectedStateId = null;
    this.selectedCityId = null;
    this.stateCtrl.enable();
    this.cityCtrl.disable();
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
    this.cities = [];
    this.selectedCityId = null;
    this.cityCtrl.enable();
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
  }
  onTenantChange(tenantId: number): void {
    this.tenantId = tenantId || undefined;
  }

  addHotel(h: { id: number; label: string }) {
    const exists = this.selectedHotels.find((x) => x.id === Number(h.id));
    if (exists) return;
    this.selectedHotels.push({ id: Number(h.id), name: h.label });
    this.hotelQueryCtrl.setValue('');
  }

  removeHotel(hid: number) {
    this.selectedHotels = this.selectedHotels.filter((x) => x.id !== hid);
  }

  save() {
    const userVal = this.userCtrl.value as any;
    if (!userVal || !this.selectedHotels.length) return;
    const userId = Number(userVal.id || 0);
    const hotelIds = this.selectedHotels.map((h) => h.id);
    this.hotelAccessService.saveUserHotelAccess(userId, hotelIds).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: () => {
        this.dialogRef.close(false);
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
