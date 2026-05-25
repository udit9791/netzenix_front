import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { environment } from 'src/environments/environment';
import {
  ActivityCountryItem,
  ActivityListItem,
  ActivityService
} from 'src/app/core/services/activity.service';
import { ActivityCartService } from 'src/app/core/services/activity-cart.service';

@Component({
  selector: 'vex-activity-search',
  standalone: true,
  templateUrl: './activity-search.component.html',
  styleUrls: ['./activity-search.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatCardModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivitySearchComponent implements OnInit {
  imgBaseUrl = environment.imgUrl;

  countries: ActivityCountryItem[] = [];
  countriesLoading = false;

  activities: ActivityListItem[] = [];
  activitiesLoading = false;
  errorMsg = '';

  searchCtrl = new FormControl<string>('');

  // Selected country drives the activity grid; null = show country grid.
  selectedCountryId: number | null = null;
  selectedCountryName = '';

  cartCount = 0;

  constructor(
    private activityService: ActivityService,
    private cartService: ActivityCartService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cartService.count$.subscribe((c) => (this.cartCount = c));

    this.route.queryParams.subscribe((params) => {
      const cid = params['country_id'] ? Number(params['country_id']) : null;
      const search = (params['search'] ?? '').toString();
      this.searchCtrl.setValue(search, { emitEvent: false });
      if (cid) {
        this.selectedCountryId = cid;
        this.fetchActivities(cid, search);
      } else {
        this.selectedCountryId = null;
        this.selectedCountryName = '';
        this.fetchCountries();
        if (search) {
          this.fetchActivities(null, search);
        }
      }
    });
  }

  fetchCountries(): void {
    this.countriesLoading = true;
    this.activityService.listCountries().subscribe({
      next: (rows) => {
        this.countries = rows;
        this.countriesLoading = false;
      },
      error: () => {
        this.countries = [];
        this.countriesLoading = false;
      }
    });
  }

  fetchActivities(countryId: number | null, search: string): void {
    this.activitiesLoading = true;
    this.errorMsg = '';
    this.activityService
      .list({ country_id: countryId, search: search?.trim() || undefined })
      .subscribe({
        next: (rows) => {
          this.activities = rows;
          this.activitiesLoading = false;
          if (countryId) {
            const c = this.countries.find((x) => x.id === countryId);
            if (c) this.selectedCountryName = c.name;
            else if (rows.length) this.selectedCountryName = rows[0].country_name;
          }
        },
        error: () => {
          this.errorMsg = 'Failed to load activities';
          this.activitiesLoading = false;
        }
      });
  }

  openCountry(c: ActivityCountryItem): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { country_id: c.id, search: null },
      queryParamsHandling: 'merge'
    });
  }

  clearCountry(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { country_id: null, search: null },
      queryParamsHandling: 'merge'
    });
  }

  applySearch(): void {
    const term = (this.searchCtrl.value || '').trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: term || null },
      queryParamsHandling: 'merge'
    });
  }

  openActivity(a: ActivityListItem): void {
    this.router.navigate(['/activities', a.id]);
  }

  goToCart(): void {
    this.router.navigate(['/activities/cart']);
  }

  fullImgUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const base = (this.imgBaseUrl || '').replace(/\/$/, '');
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${base}/${p}`;
  }

  durationLabel(mins: number | null | undefined): string {
    if (!mins || mins <= 0) return '';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
}
