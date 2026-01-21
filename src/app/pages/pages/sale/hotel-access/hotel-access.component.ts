import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { HotelAccessService } from '../../../../services/hotel-access.service';
import { UserService } from '../../../../core/services/user.service';
import {
  Observable,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map
} from 'rxjs';

interface Assignment {
  userId: number;
  userName: string;
  hotelId: number;
  hotelName: string;
  city?: string;
  state?: string;
  country?: string;
}

@Component({
  selector: 'vex-hotel-access',
  standalone: true,
  templateUrl: './hotel-access.component.html',
  styleUrls: ['./hotel-access.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatTableModule,
    RouterModule
  ]
})
export class HotelAccessComponent implements OnInit {
  form!: FormGroup;
  userCtrl = new FormControl('', Validators.required);
  hotelQueryCtrl = new FormControl('');
  countryCtrl = new FormControl(null);
  stateCtrl = new FormControl({ value: null, disabled: true });
  cityCtrl = new FormControl({ value: null, disabled: true });
  tenantCtrl = new FormControl(null);
  selectedHotels: Array<{ id: number; name: string }> = [];
  filteredUsers$: Observable<any[]> = of([]);
  filteredHotels$: Observable<any[]> = of([]);

  columns = ['user', 'hotel', 'city', 'state', 'country', 'actions'];
  assignments: Assignment[] = [];
  displayAssignments: Assignment[] = [];
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  tenantOptions: Array<{ id: number; name: string }> = [];
  showTenantFilter: boolean = false;
  isMaster: boolean = false;
  isAdmin: boolean = false;
  selectedCountryId: number | null = null;
  selectedStateId: number | null = null;
  selectedCityId: number | null = null;
  userPermissions: string[] = [];

  // Dialog moved to dedicated component

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService,
    private hotelAccessService: HotelAccessService,
    private userService: UserService,
    private dialog: MatDialog
  ) {}

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

  ngOnInit(): void {
    this.form = this.fb.group({
      user: this.userCtrl,
      hotelQuery: this.hotelQueryCtrl
    });
    this.userPermissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );
    this.isMaster = String(localStorage.getItem('is_master') || '') === '1';
    const rolesRaw = localStorage.getItem('roles') || '[]';
    const roles: string[] = JSON.parse(rolesRaw);
    this.isAdmin = roles.includes('Super Admin') || roles.includes('Admin');
    this.showTenantFilter = this.isMaster || this.isAdmin;
    if (this.showTenantFilter) {
      this.loadTenants();
    }
    this.loadAssignments();
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });

    this.filteredUsers$ = this.userCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const query = String(q || '').trim();
        if (!query) return of([]);
        const tenantId =
          this.showTenantFilter &&
          this.tenantCtrl.value !== null &&
          this.tenantCtrl.value !== undefined
            ? Number(this.tenantCtrl.value as any)
            : undefined;
        return this.userService
          .getUsersForAutocomplete(query, undefined, tenantId)
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
                    [u.name, u.email].filter((x) => !!x).join(' ') ||
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
        const selectedUserId = (this.userCtrl.value as any)?.id
          ? Number((this.userCtrl.value as any).id)
          : 0;
        const cityId = this.selectedCityId ?? undefined;
        const stateId = this.selectedStateId ?? undefined;
        const countryId = this.selectedCountryId ?? undefined;
        const tenantId =
          this.showTenantFilter &&
          this.tenantCtrl.value !== null &&
          this.tenantCtrl.value !== undefined
            ? Number(this.tenantCtrl.value as any)
            : undefined;
        const obs =
          selectedUserId > 0
            ? this.hotelService.getAssignedHotels(
                query,
                10,
                cityId,
                stateId,
                countryId,
                undefined,
                tenantId
              )
            : this.hotelService.searchHotelsAutocomplete(
                query,
                10,
                cityId,
                stateId,
                countryId,
                true,
                undefined,
                undefined,
                tenantId
              );
        return obs.pipe(
          map((res: any) => {
            const rows = Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res)
                ? res
                : [];
            return rows.map((h: any) => {
              const name = h.name || h.hotel_name || '';
              const city = h.city_name || '';
              return {
                id: h.id,
                label: [name, city].filter((x) => !!x).join(' — ')
              };
            });
          })
        );
      })
    );

    this.userCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe(() => this.applyFilters());
    this.hotelQueryCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe(() => this.applyFilters());
    this.countryCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id) => this.onCountryChange(Number(id || 0)));
    this.stateCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id) => this.onStateChange(Number(id || 0)));
    this.cityCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id) => this.onCityChange(Number(id || 0)));
    this.tenantCtrl.valueChanges
      .pipe(debounceTime(150))
      .subscribe((id) => this.onTenantChange(Number(id || 0)));
  }

  loadAssignments(tenantId?: number) {
    this.hotelAccessService.getAssignments(tenantId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        this.assignments = rows.map((a: any) => ({
          userId: Number(a.userId ?? a.user_id),
          userName: String(a.userName ?? a.user_name ?? ''),
          hotelId: Number(a.hotelId ?? a.hotel_id),
          hotelName: String(a.hotelName ?? a.hotel_name ?? ''),
          city: String(a.city ?? a.city_name ?? ''),
          state: String(a.state ?? a.state_name ?? ''),
          country: String(a.country ?? a.country_name ?? '')
        }));
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to load hotel access list', err);
      }
    });
  }

  applyFilters() {
    const userVal = this.userCtrl.value as any;
    const hotelVal = String(this.hotelQueryCtrl.value || '')
      .trim()
      .toLowerCase();
    const userIdFilter =
      userVal && typeof userVal === 'object' && userVal.id
        ? Number(userVal.id)
        : null;
    const userQuery =
      typeof userVal === 'string'
        ? userVal.trim().toLowerCase()
        : String(
            (userVal?.label ||
              [userVal?.name, userVal?.email]
                .filter((x: any) => !!x)
                .join(' ') ||
              '') as string
          )
            .trim()
            .toLowerCase();
    const selectedCountryName = this.selectedCountryId
      ? String(
          this.countries.find(
            (c: any) => Number(c.id) === Number(this.selectedCountryId)
          )?.name || ''
        ).toLowerCase()
      : '';
    const selectedStateName = this.selectedStateId
      ? String(
          this.states.find(
            (s: any) => Number(s.id) === Number(this.selectedStateId)
          )?.name || ''
        ).toLowerCase()
      : '';
    const selectedCityName = this.selectedCityId
      ? String(
          this.cities.find(
            (ci: any) => Number(ci.id) === Number(this.selectedCityId)
          )?.name || ''
        ).toLowerCase()
      : '';
    this.displayAssignments = this.assignments.filter((a) => {
      let ok = true;
      if (userIdFilter) ok = ok && a.userId === userIdFilter;
      else if (userQuery)
        ok = ok && a.userName.toLowerCase().includes(userQuery);
      if (hotelVal) ok = ok && a.hotelName.toLowerCase().includes(hotelVal);
      if (selectedCountryName)
        ok =
          ok && String(a.country || '').toLowerCase() === selectedCountryName;
      if (selectedStateName)
        ok = ok && String(a.state || '').toLowerCase() === selectedStateName;
      if (selectedCityName)
        ok = ok && String(a.city || '').toLowerCase() === selectedCityName;
      return ok;
    });
  }

  openAssignDialog() {
    const currentTenantId =
      this.showTenantFilter &&
      this.tenantCtrl.value !== null &&
      this.tenantCtrl.value !== undefined
        ? Number(this.tenantCtrl.value as any)
        : undefined;
    import('./assign-hotel-access-dialog.component').then(
      ({ AssignHotelAccessDialogComponent }) => {
        const ref = this.dialog.open(AssignHotelAccessDialogComponent, {
          width: '720px',
          data: { isMaster: this.isMaster, tenantId: currentTenantId }
        });
        ref.afterClosed().subscribe((ok) => {
          if (ok) {
            if (currentTenantId !== undefined)
              this.loadAssignments(currentTenantId);
            else this.loadAssignments();
          }
        });
      }
    );
  }

  deleteAssignment(userId: number) {
    this.hotelAccessService.deleteUserHotelAccess(userId).subscribe({
      next: () => {
        this.loadAssignments();
      },
      error: (err) => {
        console.error('Failed to delete hotel access', err);
      }
    });
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
          this.applyFilters();
        },
        error: () => {}
      });
    } else {
      this.applyFilters();
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
          this.applyFilters();
        },
        error: () => {}
      });
    } else {
      this.applyFilters();
    }
  }

  onCityChange(cityId: number): void {
    this.selectedCityId = cityId || null;
    this.applyFilters();
  }

  onTenantChange(tenantId: number): void {
    const tid = tenantId || null;
    if (tid !== null) {
      this.loadAssignments(tid);
    } else {
      this.loadAssignments();
    }
  }

  loadTenants(): void {
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
      },
      error: () => {
        this.tenantOptions = [];
      }
    });
  }

  hasPermission(perm: string): boolean {
    return this.userPermissions.includes(perm);
  }
}
