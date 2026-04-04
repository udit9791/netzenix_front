import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface SegmentSelection {
  segmentId: number;
  orderDetailId: number;
}

@Component({
  selector: 'vex-booking-cancellation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './booking-cancellation.component.html'
})
export class BookingCancellationComponent implements OnInit {
  orderId: string = '';
  orderDetails: any = null;
  flightDetails: any = null;
  hotelDetails: any = null;
  loading: boolean = true;
  submitting: boolean = false;
  error: string = '';

  cancelRequests: any[] = [];
  cancelStatusMap: Record<string, string> = {};

  // segmentId -> orderDetailId -> selected
  segmentSelections: Record<number, Record<number, boolean>> = {};

  currentUserId: number | null = null;
  isOrderOwner: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.getCurrentUserId();
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.orderId = params['id'];
        this.fetchOrderDetails(this.orderId);
      } else {
        this.error = 'Order ID not found';
        this.loading = false;
      }
    });
  }

  get passengers(): any[] {
    const d = this.orderDetails?.details;
    return Array.isArray(d) ? d : [];
  }

  get segments(): any[] {
    const d = this.flightDetails?.details;
    return Array.isArray(d) ? d : [];
  }

  private getFareRules(): any[] {
    const invRules = this.flightDetails?.inventory?.fare_rules ?? [];
    const topRules = this.flightDetails?.fare_rules ?? [];
    if (Array.isArray(topRules) && topRules.length > 0) {
      return topRules;
    }
    return Array.isArray(invRules) ? invRules : [];
  }

  private buildFareRulesMessage(): string {
    if (this.isHotelType) {
      const rules = this.getHotelRefundRules();
      if (!rules || rules.length === 0) {
        return 'No refund rules available for this booking.<br/>Are you sure you want to submit cancellation request?';
      }
      let html =
        '<table style="width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #000;">' +
        '<thead><tr>' +
        '<th style="text-align:left;padding:4px;border:1px solid #000;">Days Before Check-In</th>' +
        '<th style="text-align:left;padding:4px;border:1px solid #000;">Penelty Amount (₹)</th>' +
        '<th style="text-align:left;padding:4px;border:1px solid #000;">Percentage (%)</th>' +
        '</tr></thead><tbody>';
      rules.forEach((r: any) => {
        const days = r?.days_before_checkin ?? '-';
        const amt = r?.amount ?? 0;
        const pct = r?.percentage ?? '-';
        html += `<tr><td style="padding:4px;border:1px solid #000;">${days}</td><td style="padding:4px;border:1px solid #000;">${amt}</td><td style="padding:4px;border:1px solid #000;">${pct}</td></tr>`;
      });
      html += '</tbody></table>';
      html +=
        '<div style="margin-top:12px;">Are you sure you want to submit cancellation request with these refund rules?</div>';
      return html;
    } else {
      const rules = this.getFareRules();
      if (!rules || rules.length === 0) {
        return 'No fare rules available for this booking.<br/>Are you sure you want to submit cancellation request?';
      }
      let html =
        '<table style="width:100%;border-collapse:collapse;margin-top:8px;">' +
        '<thead><tr>' +
        '<th style="text-align:left;padding:4px;">Days Before Departure</th>' +
        '<th style="text-align:left;padding:4px;">Penalty Amount (₹)</th>' +
        '</tr></thead><tbody>';
      rules.forEach((r: any) => {
        const days = r?.days_before_departure ?? '-';
        const amt = r?.refundable_amount ?? r?.amount ?? 0;
        html += `<tr><td style="padding:4px;">${days}</td><td style="padding:4px;">${amt}</td></tr>`;
      });
      html += '</tbody></table>';
      html +=
        '<div style="margin-top:12px;">Are you sure you want to submit cancellation request with these penalty amounts?</div>';
      return html;
    }
  }

  private getHotelRefundRules(): any[] {
    const invRules = this.hotelDetails?.inventory?.refund_rules ?? [];
    const topRules = this.hotelDetails?.refund_rules ?? [];
    if (Array.isArray(topRules) && topRules.length > 0) {
      return topRules;
    }
    return Array.isArray(invRules) ? invRules : [];
  }

  get onwardSegments(): any[] {
    return this.segments.filter(
      (s) => (s.type || '').toLowerCase() === 'onward'
    );
  }

  get returnSegments(): any[] {
    return this.segments.filter(
      (s) => (s.type || '').toLowerCase() === 'return'
    );
  }

  private fetchOrderDetails(orderId: string) {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/orders/${orderId}`).subscribe({
      next: (res: any) => {
        this.orderDetails = res?.data ?? res;
        const order = this.orderDetails;
        const orderUserId = Number(order?.user_id ?? order?.userId ?? 0);
        this.isOrderOwner =
          !!this.currentUserId &&
          !!orderUserId &&
          Number(this.currentUserId) === orderUserId;
        if (order?.type === 'flight' && order?.type_id) {
          this.fetchFlightDetails(order.type_id);
        } else if (order?.type === 'hotel' && order?.type_id) {
          this.fetchHotelDetails(order.type_id);
        } else if (order?.type === 'external_flight' && order?.external_id) {
          this.fetchExternalFlightDetails(order.external_id);
        } else {
          this.loading = false;
        }
        if (order?.id) {
          this.fetchCancelRequests(order.id);
        }
      },
      error: () => {
        this.error = 'Failed to load order details';
        this.loading = false;
      }
    });
  }

  private fetchFlightDetails(typeId: number) {
    this.http.get(`${environment.apiUrl}/flight-details/${typeId}`).subscribe({
      next: (res: any) => {
        this.flightDetails = res?.data ?? res;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load flight details';
        this.loading = false;
      }
    });
  }

  private fetchHotelDetails(typeId: number) {
    this.http.get(`${environment.apiUrl}/hotel-details/${typeId}`).subscribe({
      next: (res: any) => {
        this.hotelDetails = res?.data ?? res;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load hotel details';
        this.loading = false;
      }
    });
  }

  private fetchExternalFlightDetails(externalId: string) {
    this.http
      .get(`${environment.apiUrl}/orders/external-booking/${externalId}`)
      .subscribe({
        next: (res: any) => {
          const inv = res?.data ?? res;
          this.flightDetails = {
            inventory: inv,
            details: Array.isArray(inv?.details) ? inv.details : []
          };
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load flight details';
          this.loading = false;
        }
      });
  }

  private getCurrentUserId(): number | null {
    try {
      const raw =
        localStorage.getItem('user') || localStorage.getItem('userData');
      if (!raw) {
        return null;
      }
      const u = JSON.parse(raw as string);
      const id = Number(u?.id ?? u?.user_id ?? 0);
      return id || null;
    } catch {
      return null;
    }
  }

  private fetchCancelRequests(orderId: number) {
    this.http
      .get(`${environment.apiUrl}/orders/${orderId}/cancel-requests`)
      .subscribe({
        next: (res: any) => {
          const list = res?.data ?? res;
          this.cancelRequests = Array.isArray(list) ? list : [];
          this.buildCancelStatusMap();
        },
        error: () => {
          this.cancelRequests = [];
          this.cancelStatusMap = {};
        }
      });
  }

  private buildCancelStatusMap() {
    this.cancelStatusMap = {};

    this.cancelRequests.forEach((r: any) => {
      if (Array.isArray(r.details)) {
        r.details.forEach((d: any) => {
          const segmentId = Number(d.segment_id);
          const orderDetailId = Number(d.order_detail_id);

          if (!segmentId || !orderDetailId) return;

          const key = `${segmentId}_${orderDetailId}`;
          const raw =
            d.status_name ?? d.status ?? r.status_name ?? r.status ?? '';
          const status = raw != null ? String(raw).trim() : '';
          this.cancelStatusMap[key] = status;
        });
      }
    });
  }

  getCancelStatus(segmentId: number, orderDetailId: number): string {
    const key = `${segmentId}_${orderDetailId}`;
    return this.cancelStatusMap[key] || '';
  }

  isCancellationRequested(segmentId: number, orderDetailId: number): boolean {
    const status = this.getCancelStatus(segmentId, orderDetailId);
    return !!status;
  }

  getStatusName(): string {
    const s = this.orderDetails?.status_name;
    if (s) return String(s);
    const id = this.orderDetails?.status;
    if (id === 1) return 'Confirmed';
    if (id === 0) return 'Pending';
    if (id === 2) return 'Cancelled';
    if (id === 11) return 'Requested';
    return 'Unknown';
  }

  isSelected(segmentId: number, orderDetailId: number): boolean {
    return !!this.segmentSelections[segmentId]?.[orderDetailId];
  }

  toggleSelection(
    segmentId: number,
    orderDetailId: number,
    selected: boolean
  ): void {
    if (!this.segmentSelections[segmentId]) {
      this.segmentSelections[segmentId] = {};
    }
    this.segmentSelections[segmentId][orderDetailId] = selected;
  }

  private getSelectedPairs(): SegmentSelection[] {
    const result: SegmentSelection[] = [];
    Object.entries(this.segmentSelections).forEach(([segIdStr, map]) => {
      const segId = Number(segIdStr);
      if (!map) return;
      Object.entries(map).forEach(([odIdStr, selected]) => {
        if (selected) {
          result.push({
            segmentId: segId,
            orderDetailId: Number(odIdStr)
          });
        }
      });
    });
    return result;
  }

  get hasSelection(): boolean {
    return this.getSelectedPairs().length > 0;
  }

  submitCancellationRequests(): void {
    const pairs = this.getSelectedPairs();
    if (!this.orderDetails?.id) {
      alert('Missing order ID');
      return;
    }
    if (!pairs.length) {
      alert('Please select at least one passenger and sector to cancel');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Cancellation Request',
        message: this.buildFareRulesMessage(),
        confirmText: 'Submit Cancellation',
        cancelText: 'Close',
        flightDetails: this.flightDetails
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.performSubmitCancellationRequests(pairs);
    });
  }

  private performSubmitCancellationRequests(pairs: SegmentSelection[]): void {
    if (!this.orderDetails?.id) {
      alert('Missing order ID');
      return;
    }
    this.submitting = true;
    const isHotel =
      String(this.orderDetails?.type || '').toLowerCase() === 'hotel';
    const payload: any = {
      order_id: this.orderDetails.id,
      type: isHotel ? 'hotel' : 'flight',
      items: pairs.map((p) =>
        isHotel
          ? {
              detail_id: p.segmentId,
              segment_id: null
            }
          : {
              detail_id: p.orderDetailId,
              segment_id: p.segmentId
            }
      )
    };
    this.http
      .post(`${environment.apiUrl}/orders/cancel-request`, payload)
      .subscribe({
        next: () => {
          this.submitting = false;
          alert('Cancellation request submitted');
          this.router.navigate([
            '/flights/booking-confirmation',
            this.orderDetails.id
          ]);
        },
        error: (err) => {
          console.error('Error submitting cancellation requests', err);
          this.submitting = false;
          alert('Failed to submit cancellation request');
        }
      });
  }

  goBack(): void {
    if (this.orderDetails?.id) {
      this.router.navigate([
        '/flights/booking-confirmation',
        this.orderDetails.id
      ]);
    } else {
      this.router.navigate(['/transactions/cancel-requests']);
    }
  }

  get isHotelType(): boolean {
    return String(this.orderDetails?.type || '').toLowerCase() === 'hotel';
  }

  get hotelRooms(): any[] {
    const r = this.orderDetails?.hotel_rooms;
    return Array.isArray(r) ? r : [];
  }

  getHotelOrderDetailId(): number | null {
    const d = this.orderDetails?.details;
    if (Array.isArray(d) && d.length > 0) {
      const id = Number(d[0]?.id || 0);
      return id || null;
    }
    return null;
  }
}
