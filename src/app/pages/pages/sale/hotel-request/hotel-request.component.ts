import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { BookingService } from '../../../../services/booking.service';
import { NotificationService } from '../../../../services/notification.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'vex-hotel-request',
  standalone: true,
  templateUrl: './hotel-request.component.html',
  styleUrls: ['./hotel-request.component.scss'],
  imports: [
    CommonModule,
    NgFor,
    NgIf,
    RouterModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
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
export class HotelRequestComponent implements OnInit {
  requests: any[] = [];
  displayedColumns: string[] = [
    'reference_id',
    'hotel',
    'traveller',
    'check_in',
    'check_out',
    'status',
    'total_fare',
    'actions'
  ];
  isLoading = true;
  searchValue = '';
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  isMaster: boolean = false;
  isAdmin: boolean = false;
  showTenantFilter: boolean = false;
  tenantCtrl = new FormControl<number | null>(null);
  supplierCtrl = new FormControl<number | null>(null);
  tenantOptions: Array<{ id: number; name: string }> = [];
  supplierOptions: Array<{ id: number; name: string }> = [];

  constructor(
    private bookingService: BookingService,
    private notificationService: NotificationService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const isMasterRaw = localStorage.getItem('is_master');
    this.isMaster = isMasterRaw === '1' || isMasterRaw === 'true';
    const rolesRaw = localStorage.getItem('roles') || '[]';
    const roles: string[] = JSON.parse(rolesRaw);
    this.isAdmin = roles.includes('Super Admin') || roles.includes('Admin');
    console.log('HotelRequest isMaster:', this.isMaster);
    console.log('HotelRequest isAdmin:', this.isAdmin);
    this.showTenantFilter = this.isMaster || this.isAdmin;
    if (this.showTenantFilter) {
      this.loadTenants();
      this.tenantCtrl.valueChanges.subscribe((val) => {
        const tid = val !== null && val !== undefined ? Number(val) : undefined;
        this.loadSuppliers(tid);
        this.loadRequests();
      });
      this.supplierCtrl.valueChanges.subscribe(() => {
        this.loadRequests();
      });
    }
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    const tenantId =
      this.showTenantFilter && this.tenantCtrl.value !== null
        ? Number(this.tenantCtrl.value)
        : undefined;
    const supplierId =
      this.showTenantFilter && this.supplierCtrl.value !== null
        ? Number(this.supplierCtrl.value)
        : undefined;
    this.bookingService.getHotelRequests(tenantId, supplierId).subscribe({
      next: (response: any) => {
        this.requests = response?.data ?? response ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.error('Failed to load hotel requests');
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

  viewBooking(bookingId: number): void {
    if (bookingId) {
      this.router.navigate(['/payment-confirmation', bookingId]);
    } else {
      this.notificationService.error('Booking ID not found');
    }
  }

  processingId: number | null = null;

  onConfirm(orderId: number): void {
    if (!orderId) return;
    const ok = window.confirm('Confirm this hotel request?');
    if (!ok) return;
    this.processingId = orderId;
    this.bookingService.confirmHotelRequest(orderId).subscribe({
      next: () => {
        this.notificationService.success('Request confirmed');
        this.processingId = null;
        this.loadRequests();
      },
      error: () => {
        this.notificationService.error('Failed to confirm request');
        this.processingId = null;
      }
    });
  }

  onDecline(orderId: number): void {
    if (!orderId) return;
    const ok = window.confirm('Decline (cancel) this hotel request?');
    if (!ok) return;
    this.processingId = orderId;
    this.bookingService.declineHotelRequest(orderId).subscribe({
      next: () => {
        this.notificationService.success('Request declined');
        this.processingId = null;
        this.loadRequests();
      },
      error: () => {
        this.notificationService.error('Failed to decline request');
        this.processingId = null;
      }
    });
  }
}
