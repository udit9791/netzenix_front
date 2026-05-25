import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { ActivityService } from 'src/app/core/services/activity.service';

interface SupplierBooking {
  id: number;
  contact_email: string | null;
  contact_phone: string | null;
  booking_status: number;
  created_at: string;
  total_amount: number | null;
  items: any[];
  contact: any | null;
  travelers: any[];
}

@Component({
  selector: 'vex-activity-bookings',
  standalone: true,
  templateUrl: './activity-bookings.component.html',
  styleUrls: ['./activity-bookings.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivityBookingsComponent implements OnInit {
  loading = false;
  bookings: SupplierBooking[] = [];
  selectedTab = 0;

  // tab index → backend status filter (null = all)
  private statusByTab: Array<number | null> = [0, 1, 2, null];

  constructor(
    private activityService: ActivityService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    const status = this.statusByTab[this.selectedTab];
    this.activityService.supplierListBookings(status).subscribe({
      next: (rows) => {
        this.bookings = rows as SupplierBooking[];
        this.loading = false;
      },
      error: () => {
        this.bookings = [];
        this.loading = false;
      }
    });
  }

  confirm(b: SupplierBooking): void {
    if (!confirm(`Confirm booking #${b.id}?`)) return;
    this.activityService.supplierConfirmBooking(b.id).subscribe({
      next: () => {
        this.snackBar.open(`Booking #${b.id} confirmed`, 'Close', { duration: 2000 });
        this.fetch();
      },
      error: () => this.snackBar.open('Failed to confirm', 'Close', { duration: 2500 })
    });
  }

  reject(b: SupplierBooking): void {
    if (!confirm(`Reject booking #${b.id}? Inventory will be released.`)) return;
    this.activityService.supplierRejectBooking(b.id).subscribe({
      next: () => {
        this.snackBar.open(`Booking #${b.id} rejected`, 'Close', { duration: 2000 });
        this.fetch();
      },
      error: () => this.snackBar.open('Failed to reject', 'Close', { duration: 2500 })
    });
  }

  statusLabel(s: number): string {
    return s === 0
      ? 'Pending'
      : s === 1
        ? 'Confirmed'
        : s === 2
          ? 'Rejected'
          : s === 3
            ? 'Cancelled'
            : 'Unknown';
  }

  statusClass(s: number): string {
    if (s === 0) return 'bg-amber-100 text-amber-800';
    if (s === 1) return 'bg-green-100 text-green-800';
    if (s === 2) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  }
}
