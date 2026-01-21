import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { Observable, of, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  startWith
} from 'rxjs/operators';
import { UserService } from 'src/app/core/services/user.service';

type ActivityOption = {
  id: number;
  label: string;
  city?: string;
  state?: string;
  country?: string;
};

@Component({
  selector: 'vex-activity-search',
  standalone: true,
  templateUrl: './activity-search.component.html',
  styleUrls: ['./activity-search.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatCardModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivitySearchComponent implements OnInit {
  form!: FormGroup;
  searchCtrl = new FormControl<string>('');
  countryCtrl = new FormControl<number | null>(null);
  stateCtrl = new FormControl<number | null>(null);
  cityCtrl = new FormControl<number | null>(null);

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  filteredOptions$: Observable<ActivityOption[]> = of([]);
  private searchTerm$ = new Subject<string>();

  results: Array<{
    id: number;
    title: string;
    country: string;
    state: string;
    city: string;
    is_active: boolean;
    has_time_slot: boolean;
    cover_image?: string | null;
    min_adult_price?: number | null;
    min_child_price?: number | null;
    min_price?: number | null;
  }> = [];
  loading = false;
  errorMsg = '';

  private apiUrl = environment.apiUrl;
  imgBaseUrl: string = environment.imgUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      search: this.searchCtrl,
      country_id: this.countryCtrl,
      state_id: this.stateCtrl,
      city_id: this.cityCtrl
    });

    this.loadCountries();

    this.countryCtrl.valueChanges
      .pipe(startWith(this.countryCtrl.value))
      .subscribe((countryId) => {
        this.states = [];
        this.stateCtrl.setValue(null, { emitEvent: false });
        this.cities = [];
        this.cityCtrl.setValue(null, { emitEvent: false });
        if (countryId) {
          this.userService.getStatesByCountry(countryId).subscribe({
            next: (res: any) => {
              this.states = Array.isArray(res)
                ? res
                : res?.data
                  ? res.data
                  : [];
            },
            error: () => {
              this.states = [];
            }
          });
        }
      });

    this.stateCtrl.valueChanges
      .pipe(startWith(this.stateCtrl.value))
      .subscribe((stateId) => {
        this.cities = [];
        this.cityCtrl.setValue(null, { emitEvent: false });
        if (stateId) {
          this.userService.getCitiesByState(stateId).subscribe({
            next: (res: any) => {
              this.cities = Array.isArray(res)
                ? res
                : res?.data
                  ? res.data
                  : [];
            },
            error: () => {
              this.cities = [];
            }
          });
        }
      });

    this.filteredOptions$ = this.searchTerm$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => this.fetchOptions(term))
    );

    this.route.queryParams.subscribe((params) => {
      const search = (params['search'] ?? '').toString();
      const countryId = params['country_id']
        ? Number(params['country_id'])
        : null;
      const stateId = params['state_id'] ? Number(params['state_id']) : null;
      const cityId = params['city_id'] ? Number(params['city_id']) : null;

      this.searchCtrl.setValue(search, { emitEvent: false });

      const hasFullLocation =
        countryId !== null && stateId !== null && cityId !== null;

      if (!hasFullLocation) {
        if (countryId) {
          this.countryCtrl.setValue(countryId, { emitEvent: false });
        }
        if (stateId) {
          this.stateCtrl.setValue(stateId, { emitEvent: false });
        }
        if (cityId) {
          this.cityCtrl.setValue(cityId, { emitEvent: false });
        }
        return;
      }

      if (countryId) {
        this.countryCtrl.setValue(countryId, { emitEvent: false });
        this.userService.getStatesByCountry(countryId).subscribe({
          next: (res: any) => {
            this.states = Array.isArray(res) ? res : res?.data ? res.data : [];

            if (stateId) {
              this.stateCtrl.setValue(stateId, { emitEvent: false });
              this.userService.getCitiesByState(stateId).subscribe({
                next: (res2: any) => {
                  this.cities = Array.isArray(res2)
                    ? res2
                    : res2?.data
                      ? res2.data
                      : [];

                  if (cityId) {
                    this.cityCtrl.setValue(cityId, { emitEvent: false });
                  }

                  this.fetchActivities({
                    search,
                    country_id: countryId,
                    state_id: stateId,
                    city_id: cityId
                  });
                },
                error: () => {
                  this.cities = [];
                  this.fetchActivities({
                    search,
                    country_id: countryId,
                    state_id: stateId,
                    city_id: null
                  });
                }
              });
            } else {
              this.fetchActivities({
                search,
                country_id: countryId,
                state_id: null,
                city_id: null
              });
            }
          },
          error: () => {
            this.states = [];
            this.fetchActivities({
              search,
              country_id: countryId,
              state_id: null,
              city_id: null
            });
          }
        });
      } else {
        this.fetchActivities({
          search,
          country_id: null,
          state_id: null,
          city_id: null
        });
      }
    });
  }

  displayOption(opt: ActivityOption | string | null): string {
    if (!opt) return '';
    if (typeof opt === 'string') return opt;
    const loc = [opt.city, opt.state, opt.country].filter(Boolean).join(', ');
    return [opt.label, loc].filter(Boolean).join(' — ');
  }

  onSearchKeyup(event: KeyboardEvent): void {
    const val = (event.target as HTMLInputElement)?.value ?? '';
    this.searchTerm$.next(val);
  }

  private fetchOptions(term: string): Observable<ActivityOption[]> {
    const trimmed = (term || '').trim();
    if (!trimmed) return of([]);
    let params = new HttpParams().set('search', trimmed);
    const v = this.form.value;
    if (v.country_id) params = params.set('country_id', String(v.country_id));
    if (v.state_id) params = params.set('state_id', String(v.state_id));
    if (v.city_id) params = params.set('city_id', String(v.city_id));
    return this.http.get<any>(`${this.apiUrl}/activities`, { params }).pipe(
      map((res) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        return rows.slice(0, 10).map((r: any) => ({
          id: Number(r.id),
          label: String(r.title || `Activity #${r.id}`),
          city: String(r.city_name || ''),
          state: String(r.state_name || ''),
          country: String(r.country_name || '')
        }));
      })
    );
  }

  search(): void {
    const v = this.form.value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: v.search || null,
        country_id: v.country_id || null,
        state_id: v.state_id || null,
        city_id: v.city_id || null
      },
      queryParamsHandling: 'merge'
    });
  }

  private fetchActivities(filters: {
    search: string;
    country_id: number | null;
    state_id: number | null;
    city_id: number | null;
  }): void {
    this.loading = true;
    this.errorMsg = '';
    this.results = [];

    let params = new HttpParams();
    const term = (filters.search || '').toString().trim();
    if (term) params = params.set('search', term);
    if (filters.country_id)
      params = params.set('country_id', String(filters.country_id));
    if (filters.state_id)
      params = params.set('state_id', String(filters.state_id));
    if (filters.city_id)
      params = params.set('city_id', String(filters.city_id));

    this.http.get<any>(`${this.apiUrl}/activities`, { params }).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        this.results = rows.map((r: any) => {
          const minAdult =
            r.min_adult_price !== undefined && r.min_adult_price !== null
              ? Number(r.min_adult_price)
              : null;
          const minChild =
            r.min_child_price !== undefined && r.min_child_price !== null
              ? Number(r.min_child_price)
              : null;
          const minPrice =
            r.min_price !== undefined && r.min_price !== null
              ? Number(r.min_price)
              : minAdult !== null
                ? minAdult
                : minChild;
          return {
            id: Number(r.id),
            title: String(r.title || ''),
            country: String(r.country_name || ''),
            state: String(r.state_name || ''),
            city: String(r.city_name || ''),
            is_active: Number(r.is_active) === 1 || r.is_active === true,
            has_time_slot:
              Number(r.has_time_slot) === 1 || r.has_time_slot === true,
            cover_image: r.cover_image || null,
            min_adult_price: minAdult,
            min_child_price: minChild,
            min_price: minPrice
          };
        });
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load activities';
        this.loading = false;
      }
    });
  }

  openActivity(a: { id: number }): void {
    if (!a || !a.id) return;
    this.router.navigate(['/activities', a.id]);
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
}
