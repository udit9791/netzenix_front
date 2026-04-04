import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'vex-cancel-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatDividerModule
  ],
  templateUrl: './cancel-request-dialog.component.html',
  styleUrl: './cancel-request-dialog.component.scss'
})
export class CancelRequestDialogComponent implements OnInit {
  loading = false;
  amount: number | null = null;
  order: any = null;
  orderDetails: any[] = [];
  displayedColumns = ['traveler', 'status'];
  requestColumns = [
    'flight',
    'from',
    'to',
    'date',
    'segment',
    'traveler',
    'status',
    'penalty'
  ];
  statuses: Array<{ id: number; name: string; is_active: number }> = [];
  statusMap: Record<number, string> = {};
  requestDetails: any[] = [];
  requestDetailsView: Array<{
    segmentId: number;
    traveler: string;
    status: string;
    flight: string;
    from: string;
    to: string;
    date: string;
    penaltyAmount: number;
  }> = [];
  rejectNote: string = '';

  constructor(
    private http: HttpClient,
    private paymentService: PaymentService,
    private router: Router,
    public dialogRef: MatDialogRef<CancelRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { orderId: number; request: any; requestDetails?: any[] }
  ) {}

  ngOnInit(): void {
    this.loadStatuses();
    this.fetchOrder(this.data.orderId);
    if (this.data.request && this.data.request.final_amount) {
      this.amount = Number(this.data.request.final_amount);
    }
    if (Array.isArray(this.data.requestDetails)) {
      this.requestDetails = this.data.requestDetails;
      this.buildRequestDetailsView();
    } else if (this.data.request && Array.isArray(this.data.request.details)) {
      this.requestDetails = this.data.request.details;
      this.buildRequestDetailsView();
    }
  }

  loadStatuses(): void {
    this.paymentService.getPaymentStatuses().subscribe({
      next: (list) => {
        this.statuses = list || [];
        this.statusMap = {};
        this.statuses.forEach((s) => {
          if (s && typeof s.id === 'number') {
            this.statusMap[s.id] = s.name;
          }
        });
      },
      error: () => {
        this.statuses = [];
        this.statusMap = {};
      }
    });
  }

  fetchOrder(orderId: number): void {
    this.loading = true;
    this.http.get(`${environment.apiUrl}/orders/${orderId}`).subscribe({
      next: (res: any) => {
        const o = res?.data || res;
        this.order = o;
        this.orderDetails = Array.isArray(o?.details) ? o.details : [];
        this.buildRequestDetailsView();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getStatusName(id: any): string {
    const num = Number(id);
    return this.statusMap[num] || String(id || '');
  }

  hasIGST(): boolean {
    return Number(this.order?.igst || 0) > 0;
  }

  hasSGST(): boolean {
    return Number(this.order?.sgst || 0) > 0;
  }

  hasCGST(): boolean {
    return Number(this.order?.cgst || 0) > 0;
  }

  buildRequestDetailsView(): void {
    if (
      !Array.isArray(this.orderDetails) ||
      !Array.isArray(this.requestDetails)
    ) {
      this.requestDetailsView = [];
      return;
    }
    this.requestDetailsView = this.requestDetails.map((d) => {
      const segmentId = Number(d.segment_id ?? d.segmentId ?? 0);
      const detailId = Number(
        d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
      );
      const detail = this.orderDetails.find((od) => Number(od.id) === detailId);
      const traveler = detail
        ? `${detail.first_name || ''} ${detail.last_name || ''}`.trim()
        : String(detailId || '');
      const statusRaw = d.status_name ?? d.status ?? '';
      const status = statusRaw != null ? String(statusRaw) : '';
      const flight = (d.flight_number ?? d.flightNumber ?? '') || '';
      const from = (d.from ?? d.source ?? '') || '';
      const to = (d.to ?? d.destination ?? '') || '';
      const dateRaw = d.flight_date ?? d.date ?? '';
      const date = dateRaw != null ? String(dateRaw) : '';
      const penaltyRaw =
        d.penalty_amount ??
        d.penaltyAmount ??
        d.panalty_amount ??
        d.refund_amount ??
        d.refundAmount ??
        d.final_amount ??
        d.finalAmount ??
        d.amount ??
        0;
      const penaltyAmount = Number(penaltyRaw || 0);
      return {
        segmentId,
        traveler,
        status,
        flight,
        from,
        to,
        date,
        penaltyAmount
      };
    });
    this.recalculatePenaltyTotal();
  }

  recalculatePenaltyTotal(): void {
    const total = this.requestDetailsView.reduce((sum, r) => {
      const v = Number(r.penaltyAmount || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    this.amount = total > 0 ? total : 0;
  }

  format(amount: any): string {
    const n = Number(amount || 0);
    return `₹ ${n.toFixed(2)}`;
  }

  confirm(): void {
    const note = (this.rejectNote || '').trim();
    const orderDetailIds: number[] = [];

    if (Array.isArray(this.requestDetails) && this.requestDetails.length) {
      this.requestDetails.forEach((d) => {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id && !orderDetailIds.includes(id)) {
          orderDetailIds.push(id);
        }
      });
    } else if (this.data?.request && Array.isArray(this.data.request.details)) {
      this.data.request.details.forEach((d: any) => {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id && !orderDetailIds.includes(id)) {
          orderDetailIds.push(id);
        }
      });
    }

    const payload = {
      order_id: this.data.orderId,
      approve_amount: this.amount,
      request_id: this.data?.request?.id,
      note,
      order_detail_id: orderDetailIds
    };
    this.http
      .post(`${environment.apiUrl}/orders/cancel-approve`, payload)
      .subscribe({
        next: (res: any) => {
          this.dialogRef.close({ success: true, data: res });
        },
        error: () => {
          this.dialogRef.close({ success: false });
        }
      });
  }

  reject(): void {
    const note = (this.rejectNote || '').trim();
    if (!note) {
      alert('Please enter note before reject');
      return;
    }
    const ok = window.confirm(
      'Are you sure you want to reject this cancellation request?'
    );
    if (!ok) {
      return;
    }
    let orderDetailId: number | null = null;
    if (Array.isArray(this.requestDetails) && this.requestDetails.length) {
      for (const d of this.requestDetails) {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id) {
          orderDetailId = id;
          break;
        }
      }
    } else if (this.data?.request) {
      const d = this.data.request as any;
      const id = Number(
        d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
      );
      if (id) {
        orderDetailId = id;
      }
    }
    const payload = {
      order_id: this.data.orderId,
      request_id: this.data?.request?.id,
      order_detail_id: orderDetailId,
      note
    };
    this.http
      .post(`${environment.apiUrl}/orders/cancel-reject`, payload)
      .subscribe({
        next: (res: any) => {
          this.dialogRef.close({ success: true, data: res });
        },
        error: () => {
          this.dialogRef.close({ success: false });
        }
      });
  }

  cancel(): void {
    this.dialogRef.close({ success: false });
  }

  viewDetails(): void {
    if (!this.data?.orderId) {
      return;
    }
    const tree = this.router.createUrlTree([
      '/flights/booking-cancellation',
      this.data.orderId
    ]);
    const url = this.router.serializeUrl(tree);
    window.open(url, '_blank');
    this.dialogRef.close({ success: false });
  }
}
