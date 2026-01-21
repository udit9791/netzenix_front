import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UserService } from 'src/app/core/services/user.service';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

interface ActivityRow {
  id: number;
  title: string;
  country: string;
  state: string;
  city: string;
  has_time_slot: boolean;
  is_active: boolean;
}

@Component({
  selector: 'vex-activity-list',
  standalone: true,
  templateUrl: './activity-list.component.html',
  styleUrls: ['./activity-list.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivityListComponent implements OnInit {
  displayedColumns: string[] = [
    'title',
    'location',
    'has_time_slot',
    'status',
    'actions'
  ];
  dataSource = new MatTableDataSource<ActivityRow>([]);

  filterForm!: FormGroup;
  tenantCtrl = new FormControl<number | null>(null);
  countryCtrl = new FormControl<number | null>(null);
  stateCtrl = new FormControl<number | null>(null);
  cityCtrl = new FormControl<number | null>(null);

  isMaster = false;
  showTenantFilter = false;
  tenantOptions: Array<{ id: number; name: string }> = [];
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  private apiUrl = environment.apiUrl;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const isMasterRaw = localStorage.getItem('is_master');
    this.isMaster = isMasterRaw === '1' || isMasterRaw === 'true';
    this.showTenantFilter = this.isMaster;

    this.filterForm = this.fb.group({
      search: [''],
      tenantId: this.tenantCtrl,
      countryId: this.countryCtrl,
      stateId: this.stateCtrl,
      cityId: this.cityCtrl
    });

    this.loadTenants();
    this.loadCountries();
    this.loadActivities();

    this.filterForm.valueChanges.subscribe(() => {
      this.loadActivities();
    });
  }

  private loadActivities(): void {
    let params = new HttpParams();
    const raw = this.filterForm.value;
    const search = (raw.search || '').toString().trim();
    if (search) {
      params = params.set('search', search);
    }
    if (
      this.showTenantFilter &&
      raw.tenantId !== null &&
      raw.tenantId !== undefined
    ) {
      params = params.set('tenant_id', String(raw.tenantId));
    }
    if (raw.countryId) {
      params = params.set('country_id', String(raw.countryId));
    }
    if (raw.stateId) {
      params = params.set('state_id', String(raw.stateId));
    }
    if (raw.cityId) {
      params = params.set('city_id', String(raw.cityId));
    }

    this.http
      .get(`${this.apiUrl}/activities`, { params })
      .subscribe((res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const mapped: ActivityRow[] = rows.map((r: any) => ({
          id: Number(r.id),
          title: String(r.title || ''),
          country: String(r.country_name || ''),
          state: String(r.state_name || ''),
          city: String(r.city_name || ''),
          has_time_slot:
            Number(r.has_time_slot) === 1 || r.has_time_slot === true,
          is_active: Number(r.is_active) === 1 || r.is_active === true
        }));
        this.dataSource = new MatTableDataSource<ActivityRow>(mapped);
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      });
  }

  private loadTenants(): void {
    if (!this.showTenantFilter) {
      this.tenantOptions = [];
      return;
    }
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

  private loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {
        this.countries = [];
      }
    });
  }

  onCountryChange(countryId: number | null): void {
    this.filterForm.patchValue(
      {
        countryId,
        stateId: null,
        cityId: null
      },
      { emitEvent: false }
    );
    this.states = [];
    this.cities = [];
    if (countryId) {
      this.userService.getStatesByCountry(countryId).subscribe({
        next: (res: any) => {
          this.states = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {
          this.states = [];
        }
      });
    }
    this.loadActivities();
  }

  onStateChange(stateId: number | null): void {
    this.filterForm.patchValue(
      {
        stateId,
        cityId: null
      },
      { emitEvent: false }
    );
    this.cities = [];
    if (stateId) {
      this.userService.getCitiesByState(stateId).subscribe({
        next: (res: any) => {
          this.cities = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {
          this.cities = [];
        }
      });
    }
    this.loadActivities();
  }

  onCityChange(cityId: number | null): void {
    this.filterForm.patchValue(
      {
        cityId
      },
      { emitEvent: false }
    );
    this.loadActivities();
  }

  get tenantIdControl(): FormControl<number | null> {
    return this.filterForm.get('tenantId') as FormControl<number | null>;
  }

  get countryIdControl(): FormControl<number | null> {
    return this.filterForm.get('countryId') as FormControl<number | null>;
  }

  get stateIdControl(): FormControl<number | null> {
    return this.filterForm.get('stateId') as FormControl<number | null>;
  }

  get cityIdControl(): FormControl<number | null> {
    return this.filterForm.get('cityId') as FormControl<number | null>;
  }

  onFilterKeyup(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? '';
    this.filterForm.patchValue({ search: value }, { emitEvent: true });
  }

  toggleStatus(row: ActivityRow): void {
    const isActive = !!row.is_active;
    const action = isActive ? 'deactivate' : 'activate';
    const confirmed = confirm(
      `Are you sure you want to ${action} this activity?`
    );
    if (!confirmed) {
      return;
    }

    this.http
      .put<any>(`${this.apiUrl}/activities/${row.id}/toggle-status`, {})
      .subscribe({
        next: (res) => {
          const updated =
            res?.data?.is_active !== undefined
              ? res.data.is_active
              : res?.is_active !== undefined
                ? res.is_active
                : null;
          if (updated !== null) {
            row.is_active = !!updated;
          }
        },
        error: () => {}
      });
  }
}
