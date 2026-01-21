import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
    FormsModule
    ,MatDividerModule
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
  statuses: Array<{ id: number; name: string; is_active: number }> = [];
  statusMap: Record<number, string> = {};

  constructor(
    private http: HttpClient,
    private paymentService: PaymentService,
    public dialogRef: MatDialogRef<CancelRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { orderId: number; request: any }
  ) {}

  ngOnInit(): void {
    this.loadStatuses();
    this.fetchOrder(this.data.orderId);
    if (this.data.request && this.data.request.final_amount) {
      this.amount = Number(this.data.request.final_amount);
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

  format(amount: any): string {
    const n = Number(amount || 0);
    return `₹ ${n.toFixed(2)}`;
  }

  confirm(): void {
    const payload = { order_id: this.data.orderId, approve_amount: this.amount, request_id: this.data?.request?.id };
    this.http.post(`${environment.apiUrl}/orders/cancel-approve`, payload).subscribe({
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
}