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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { NotificationService } from '../../services/notification.service';
import { FormControl } from '@angular/forms';
import { UserService } from 'src/app/core/services/user.service';

@Component({
  selector: 'app-my-bookings',
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
  ]
})
export class MyBookingsComponent implements OnInit {
  bookings: any[] = [];
  displayedColumns: string[] = [
    'reference_id',
    'location_sector',
    'airline_hotel',
    'travel_mode',
    'traveller',
    'travel_date',
    'status',
    'total_fare',
    'actions'
  ];
  isLoading = true;
  searchValue = '';
  filters = {
    status: 'all'
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

  ngOnInit(): void {
    const isMasterRaw = localStorage.getItem('is_master');
    this.isMaster = isMasterRaw === '1' || isMasterRaw === 'true';
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
    this.bookingService.getMyBookings(tenantId, supplierId).subscribe({
      next: (response) => {
        this.bookings = response.data;
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.error('Failed to load bookings');
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

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    // Apply filter to the table data
    console.log('Filtering with:', filterValue);
  }

  viewBooking(bookingId: string): void {
    if (bookingId) {
      this.router.navigate(['/payment-confirmation', bookingId]);
    } else {
      this.notificationService.error('Booking ID not found');
    }
  }
}
