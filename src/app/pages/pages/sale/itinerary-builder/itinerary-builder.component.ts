import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormGroup,
  FormControl
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';

interface ItineraryDay {
  title: string;
  description: string;
}

interface Itinerary {
  id: number;
  name: string;
  nights: number | null;
  travel_type: string | null;
  max_seats: number | null;
  banner_image: string | null;
  created_at: string | null;
  days: ItineraryDay[];
  is_active: number;
}

@Component({
  selector: 'vex-itinerary-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatTooltipModule,
    MatSelectModule,
    MatChipsModule,
    MatPaginatorModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './itinerary-builder.component.html',
  styleUrls: ['./itinerary-builder.component.scss']
})
export class ItineraryBuilderComponent implements OnInit {
  // kept for backwards compatibility with the original form-driven approach
  form: FormGroup;

  // filter controls
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  statusCtrl = new FormControl<'all' | 'active' | 'inactive'>('all', {
    nonNullable: true
  });
  typeCtrl = new FormControl<'all' | 'fit' | 'group'>('all', {
    nonNullable: true
  });

  displayedColumns: string[] = [
    'name',
    'type',
    'nights',
    'seats',
    'created',
    'status',
    'actions'
  ];
  items: Itinerary[] = [];
  loading = false;

  // pagination (server-side)
  total = 0;
  pageIndex = 0;
  pageSize = 15;
  pageSizeOptions = [10, 15, 25, 50];

  // sorting (server-side)
  sortBy: 'id' | 'name' | 'nights' | 'created_at' = 'id';
  sortDir: 'asc' | 'desc' = 'desc';

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      name: [''],
      days: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadItineraries();
      });

    this.statusCtrl.valueChanges.subscribe(() => {
      this.pageIndex = 0;
      this.loadItineraries();
    });

    this.typeCtrl.valueChanges.subscribe(() => {
      this.pageIndex = 0;
      this.loadItineraries();
    });

    this.loadItineraries();
  }

  get days(): FormArray {
    return this.form.get('days') as FormArray;
  }

  addDay(): void {
    const dayGroup = this.fb.group({
      title: [''],
      description: ['']
    });
    this.days.push(dayGroup);
  }

  removeDay(index: number): void {
    if (index >= 0 && index < this.days.length) {
      this.days.removeAt(index);
    }
  }

  asFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadItineraries();
  }

  sort(column: 'id' | 'name' | 'nights' | 'created_at'): void {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = 'asc';
    }
    this.loadItineraries();
  }

  sortIcon(column: string): string {
    if (this.sortBy !== column) return 'unfold_more';
    return this.sortDir === 'asc' ? 'expand_less' : 'expand_more';
  }

  clearFilters(): void {
    this.searchCtrl.setValue('', { emitEvent: false });
    this.statusCtrl.setValue('all', { emitEvent: false });
    this.typeCtrl.setValue('all', { emitEvent: false });
    this.pageIndex = 0;
    this.loadItineraries();
  }

  trackById(_: number, row: Itinerary): number {
    return row.id;
  }

  daysCount(row: Itinerary): number {
    if (row.nights !== null && row.nights !== undefined) {
      return Number(row.nights) + 1;
    }
    return Array.isArray(row.days) ? row.days.length : 0;
  }

  typeLabel(row: Itinerary): string {
    const t = String(row.travel_type || '').toLowerCase();
    if (t === 'group') return 'Group';
    if (t === 'fit') return 'FIT';
    return '—';
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  bannerThumb(row: Itinerary): string | null {
    const b = row.banner_image;
    if (!b) return null;
    if (/^https?:\/\//i.test(b)) return b;
    const base = this.apiUrl.replace(/\/api\/?$/, '');
    return `${base}/storage/${b.replace(/^\//, '')}`;
  }

  private loadItineraries(): void {
    this.loading = true;

    let params = new HttpParams()
      .set('page', String(this.pageIndex + 1))
      .set('perPage', String(this.pageSize))
      .set('sort_by', this.sortBy)
      .set('sort_dir', this.sortDir);

    const q = (this.searchCtrl.value || '').trim();
    if (q) params = params.set('q', q);

    const status = this.statusCtrl.value;
    if (status && status !== 'all') params = params.set('status', status);

    const type = this.typeCtrl.value;
    if (type && type !== 'all') params = params.set('travel_type', type);

    this.http
      .get<any>(`${this.apiUrl}/itineraries`, { params })
      .subscribe({
        next: (res) => {
          const raw = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.items = raw.map((row: any) => this.normalize(row));

          if (res?.meta && typeof res.meta.total === 'number') {
            this.total = Number(res.meta.total) || 0;
          } else {
            // server didn't paginate (older shape) — total is whatever we got
            this.total = this.items.length;
          }
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.total = 0;
          this.loading = false;
          this.toastr.error('Failed to load itineraries');
        }
      });
  }

  private normalize(row: any): Itinerary {
    return {
      id: Number(row.id || 0) || 0,
      name: String(row.name || ''),
      nights:
        row.nights !== undefined && row.nights !== null
          ? Number(row.nights)
          : null,
      travel_type: row.travel_type ?? null,
      max_seats:
        row.max_seats !== undefined && row.max_seats !== null
          ? Number(row.max_seats)
          : null,
      banner_image: row.banner_image ?? null,
      created_at: row.created_at ?? null,
      days: Array.isArray(row.days)
        ? row.days.map((d: any) => ({
            title: String(d.title || ''),
            description: String(d.description || '')
          }))
        : [],
      is_active:
        Number(
          row.is_active !== undefined && row.is_active !== null
            ? row.is_active
            : 1
        ) || 0
    };
  }

  toggleStatus(row: Itinerary): void {
    const id = Number(row.id || 0) || 0;
    if (!id) return;
    const current = Number(row.is_active || 0) || 0;
    const next = current === 1 ? 0 : 1;
    this.http
      .patch<any>(`${this.apiUrl}/itineraries/${id}/toggle-status`, {
        is_active: next === 1
      })
      .subscribe({
        next: () => {
          this.items = this.items.map((it) =>
            it.id === id ? { ...it, is_active: next } : it
          );
          this.toastr.success(
            next === 1 ? 'Itinerary activated' : 'Itinerary deactivated'
          );
        },
        error: () => {
          this.toastr.error('Could not update status');
        }
      });
  }
}
