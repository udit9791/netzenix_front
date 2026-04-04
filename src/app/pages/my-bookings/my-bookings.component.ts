import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from 'src/app/core/services/user.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter
} from '@angular/material/core';

export class MyBookingsDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value.includes('/')) {
      const parts = value.split('/');
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const year = Number(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}

const MY_BOOKINGS_DATE_FORMATS = {
  parse: {
    dateInput: 'input'
  },
  display: {
    dateInput: 'input',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'input',
    monthYearA11yLabel: 'MMMM yyyy'
  }
};

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    {
      provide: DateAdapter,
      useClass: MyBookingsDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_BOOKINGS_DATE_FORMATS }
  ]
})
export class MyBookingsComponent implements OnInit {
  bookings: any[] = [];
  displayedColumns: string[] = [
    'reference_id',
    'location_sector',
    'airline_hotel',
    'travel_mode',
    'pnr',
    'no_of_pax',
    'traveller',
    'travel_date',
    'status',
    'total_fare',
    'actions'
  ];
  isLoading = true;
  searchValue = '';
  filters: {
    status: string;
    reference: string;
    pnr: string;
    traveller: string;
    travelMode: string;
    travelDate: Date | null;
  } = {
    status: 'all',
    reference: '',
    pnr: '',
    traveller: '',
    travelMode: '',
    travelDate: null
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private bookingService: BookingService,
    private notificationService: NotificationService,
    private router: Router,
    private userService: UserService
  ) {}

  // Master-only filters
  isMaster: boolean = false;
  showTenantFilter: boolean = false;
  tenantCtrl = new FormControl<number | null>(null);
  supplierCtrl = new FormControl<number | null>(null);
  tenantOptions: Array<{ id: number; name: string }> = [];
  supplierOptions: Array<{ id: number; name: string }> = [];
  travelModeOptions: string[] = [];

  ngOnInit(): void {
    const isMasterRaw = localStorage.getItem('is_master');
    this.isMaster = isMasterRaw === '1' || isMasterRaw === 'true';

    console.log(isMasterRaw);
    this.showTenantFilter = this.isMaster;
    if (this.isMaster) {
      this.loadTenants();
      this.tenantCtrl.valueChanges.subscribe((val) => {
        const tid = val !== null && val !== undefined ? Number(val) : undefined;
        this.loadSuppliers(tid);
        this.loadBookings();
      });
      this.supplierCtrl.valueChanges.subscribe(() => {
        this.loadBookings();
      });
    }
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading = true;
    const tenantId =
      this.isMaster && this.tenantCtrl.value !== null
        ? Number(this.tenantCtrl.value)
        : undefined;
    const supplierId =
      this.isMaster && this.supplierCtrl.value !== null
        ? Number(this.supplierCtrl.value)
        : undefined;
    const reference = this.filters.reference.trim();
    const pnr = this.filters.pnr.trim();
    const traveller = this.filters.traveller.trim();
    const travelMode = this.filters.travelMode;
    const travelDateStr = this.filters.travelDate
      ? this.formatDate(this.filters.travelDate)
      : undefined;

    this.bookingService
      .getMyBookings(tenantId, supplierId, {
        reference: reference || undefined,
        pnr: pnr || undefined,
        traveller: traveller || undefined,
        travelMode: travelMode || undefined,
        travelDate: travelDateStr
      })
      .subscribe({
        next: (response) => {
          const rows = Array.isArray(response?.data) ? response.data : [];
          this.bookings = rows;
          this.travelModeOptions = Array.from(
            new Set(
              rows
                .map((b: any) =>
                  b && b.travel_mode ? String(b.travel_mode) : ''
                )
                .filter((v: string) => v !== '')
            )
          );
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.error('Failed to load bookings');
          this.bookings = [];
          this.isLoading = false;
        }
      });
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

  loadSuppliers(tenantId?: number): void {
    this.userService
      .getUsersForAutocomplete('', 'Supplier', tenantId)
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.supplierOptions = rows.map((u: any) => ({
            id: Number(u.id),
            name:
              [u.name, u.email].filter((x: any) => !!x).join(' ') ||
              `User #${u.id}`
          }));
        },
        error: () => {
          this.supplierOptions = [];
        }
      });
  }

  applyFilters(): void {
    this.loadBookings();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  viewBooking(bookingId: string): void {
    if (bookingId) {
      this.router.navigate(['/payment-confirmation', bookingId]);
    } else {
      this.notificationService.error('Booking ID not found');
    }
  }
}
