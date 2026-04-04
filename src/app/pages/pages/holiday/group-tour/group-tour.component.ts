import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from 'src/environments/environment';

interface HolidayPackage {
  id: number;
  title: string;
  days: string;
  rating?: number;
  thumb: string;
  shortDesc: string;
  departure: string;
  price: number;
  oldPrice?: number;
  tags?: string[];
  highlights?: string[];
  duration?: string;
}

@Component({
  selector: 'app-group-tour',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // Material modules used in template
    MatCardModule,
    MatListModule,
    MatCheckboxModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './group-tour.component.html',
  styleUrls: ['./group-tour.component.scss']
})
export class GroupTourComponent implements OnInit {
  filtersForm: FormGroup;
  minPrice = 10000;
  maxPrice = 300000;
  packages: HolidayPackage[] = [];
  exCityOptions: string[] = [];
  departureDateOptions: string[] = [];
  totalResults = 0;
  currentPage = 1;
  lastPage = 1;
  perPage = 10;
  sortMode: 'relevance' | 'price-asc' | 'price-desc' = 'relevance';
  apiUrl = environment.apiUrl;
  childAges: number[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.filtersForm = this.fb.group({
      cities: [[]],
      departureDates: [[]],
      rating: [0],
      priceRange: [[this.minPrice, this.maxPrice]],
      durations: [[]],
      operatorBrand: [[]]
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const childAgesParam = (
      qp.get('childAges') ||
      qp.get('child_ages') ||
      ''
    ).toString();
    if (childAgesParam) {
      this.childAges = childAgesParam
        .split(',')
        .map((x) => Number(x))
        .filter((n) => !isNaN(n as any));
    }
    this.loadPackages(1);
  }

  formatPrice(n: number) {
    return n.toLocaleString('en-IN');
  }

  onViewDetails(pkg: HolidayPackage) {
    if (!pkg || !pkg.id) {
      return;
    }
    const qp = this.route.snapshot.queryParamMap;
    const queryParams: any = {};
    const childAgesParam = qp.get('child_ages') || qp.get('childAges');
    if (childAgesParam) {
      queryParams.child_ages = childAgesParam;
    } else if (this.childAges && this.childAges.length) {
      queryParams.child_ages = this.childAges.join(',');
    }
    this.router.navigate(['/holiday/group-tour', pkg.id], {
      queryParams
    });
  }

  onMinPriceChange(value: number) {
    const current = this.filtersForm.get('priceRange')?.value || [
      this.minPrice,
      this.maxPrice
    ];
    this.filtersForm.patchValue({ priceRange: [value, current[1]] });
  }

  onMaxPriceChange(value: number) {
    const current = this.filtersForm.get('priceRange')?.value || [
      this.minPrice,
      this.maxPrice
    ];
    this.filtersForm.patchValue({ priceRange: [current[0], value] });
  }

  onFiltersChanged() {
    this.currentPage = 1;
    this.loadPackages(1);
  }

  isDepartureSelected(date: string): boolean {
    const arr: string[] = this.filtersForm.get('departureDates')?.value || [];
    return arr.includes(date);
  }

  onDepartureDateToggle(date: string, checked: boolean) {
    const ctrl = this.filtersForm.get('departureDates');
    if (!ctrl) {
      return;
    }
    const current: string[] = ctrl.value || [];
    let next = current.slice();
    if (checked) {
      if (!next.includes(date)) {
        next.push(date);
      }
    } else {
      next = next.filter((d) => d !== date);
    }
    ctrl.setValue(next);
    this.currentPage = 1;
    this.loadPackages(1);
  }

  onResetFilters() {
    this.filtersForm.reset({
      cities: [],
      departureDates: [],
      rating: 0,
      priceRange: [this.minPrice, this.maxPrice],
      durations: [],
      operatorBrand: []
    });
    this.sortMode = 'relevance';
    this.currentPage = 1;
    this.loadPackages(1);
  }

  onSortChange(mode: string) {
    this.sortMode = mode as 'relevance' | 'price-asc' | 'price-desc';
    this.applySort();
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.lastPage) {
      return;
    }
    this.currentPage = page;
    this.loadPackages(page);
  }

  private loadPackages(page: number) {
    const rawCities: string[] = this.filtersForm.get('cities')?.value || [];
    const rawDates: string[] =
      this.filtersForm.get('departureDates')?.value || [];

    let params = new HttpParams()
      .set('page', String(page))
      .set('perPage', String(this.perPage));

    rawCities.forEach((c) => {
      if (c) {
        params = params.append('cities[]', c);
      }
    });
    rawDates.forEach((d) => {
      if (d) {
        params = params.append('dates[]', d);
      }
    });
    if (this.childAges && this.childAges.length) {
      this.childAges.forEach((age) => {
        if (age >= 0) {
          params = params.append('child_ages[]', String(age));
        }
      });
    }

    this.http
      .get<any>(`${this.apiUrl}/itineraries/group-search`, { params })
      .subscribe({
        next: (res) => {
          const data = res && res.data ? res.data : res;
          const filters = data?.filters || {};
          const items = data?.items || [];
          const pagination = data?.pagination || {};

          this.exCityOptions = Array.isArray(filters.exCities)
            ? filters.exCities
            : [];
          this.departureDateOptions = Array.isArray(filters.departureDates)
            ? filters.departureDates
            : [];

          this.packages = this.mapApiItemsToPackages(items);

          this.totalResults = Number(pagination.total || this.packages.length);
          this.currentPage = Number(pagination.current_page || page);
          this.perPage = Number(pagination.per_page || this.perPage);
          this.lastPage = Number(pagination.last_page || 1);

          this.applySort();
        },
        error: () => {
          this.exCityOptions = [];
          this.departureDateOptions = [];
          this.packages = [];
          this.totalResults = 0;
          this.currentPage = 1;
          this.lastPage = 1;
        }
      });
  }

  private mapApiItemsToPackages(items: any[]): HolidayPackage[] {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((it) => {
      const id = Number(it?.id || 0) || 0;
      const nights =
        it && it.nights !== null && it.nights !== undefined
          ? Number(it.nights)
          : null;
      const daysText = nights ? `${nights} days` : '';
      const departureDates: string[] = Array.isArray(it?.departureDates)
        ? it.departureDates
        : [];
      const firstDateRaw = departureDates.length ? departureDates[0] : '';
      const firstDate = this.formatDateDisplay(firstDateRaw);
      const departureText = firstDate ? `Departure Starting ${firstDate}` : '';
      const price =
        it && it.fromPrice !== null && it.fromPrice !== undefined
          ? Number(it.fromPrice)
          : 0;

      const banner: string = it?.bannerImage || '';
      let thumbUrl = `https://picsum.photos/seed/itinerary-${id}/80`;
      if (banner) {
        const trimmed = banner.startsWith('/') ? banner.substring(1) : banner;
        thumbUrl = `${environment.imgUrl}${trimmed}`;
      }

      return {
        id,
        title: it?.name || '',
        days: daysText,
        thumb: thumbUrl,
        shortDesc: it?.description || '',
        departure: departureText,
        price,
        oldPrice: undefined,
        tags: [],
        highlights: [],
        duration: daysText
      };
    });
  }

  private applySort() {
    if (this.sortMode === 'price-asc') {
      this.packages = [...this.packages].sort(
        (a, b) => (a.price || 0) - (b.price || 0)
      );
    } else if (this.sortMode === 'price-desc') {
      this.packages = [...this.packages].sort(
        (a, b) => (b.price || 0) - (a.price || 0)
      );
    }
  }

  formatDateLabel(value: string): string {
    return this.formatDateDisplay(value);
  }

  private formatDateDisplay(value: string): string {
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
}
