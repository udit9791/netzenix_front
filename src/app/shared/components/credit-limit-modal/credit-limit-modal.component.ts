import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../services/payment.service';

export interface CreditLimitOption {
  id: number;
  name: string;
  days: number;
}

export interface CreditLimitModalData {
  transaction: any;
}

@Component({
  selector: 'vex-credit-limit-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    FormsModule
  ],
  template: `
    <div class="credit-limit-modal">
      <h2 mat-dialog-title>Select Credit Limit Timeline</h2>
      
      <mat-dialog-content class="dialog-content">
        <div class="transaction-info">
          <p><strong>Transaction Amount:</strong> ₹{{ data.transaction?.amount | number:'1.2-2' }}</p>
          <p class="text-sm text-gray-600 mt-2">Please select the credit limit timeline for this transaction.</p>
        </div>

        <div class="timeline-selection" *ngIf="!loading; else loadingTemplate">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Credit Limit Timeline</mat-label>
            <mat-select [(ngModel)]="selectedTimelineId" [disabled]="approving">
              <mat-option *ngFor="let option of creditLimitOptions" [value]="option.id">
                {{ option.name }} ({{ option.days }} days)
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <ng-template #loadingTemplate>
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p class="mt-2">Loading timeline options...</p>
          </div>
        </ng-template>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" [disabled]="approving">Cancel</button>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="onApprove()" 
          [disabled]="!selectedTimelineId || approving || loading">
          <mat-spinner diameter="20" *ngIf="approving" class="mr-2"></mat-spinner>
          {{ approving ? 'Approving...' : 'Approve Transaction' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .credit-limit-modal {
      min-width: 400px;
      padding: 0 24px;
    }
    
    .dialog-content {
      padding: 20px 0;
      margin: 0 -24px;
      padding-left: 24px;
      padding-right: 24px;
    }
    
    .transaction-info {
      margin-bottom: 24px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 12px;
      border-left: 4px solid #2196f3;
    }
    
    .transaction-info p:first-child {
      margin-bottom: 8px;
      font-size: 1.1rem;
    }
    
    .timeline-selection {
      margin-bottom: 20px;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
    }
    
    .w-full {
      width: 100%;
    }
    
    .mr-2 {
      margin-right: 8px;
    }
    
    .mt-2 {
      margin-top: 8px;
    }
    
    .text-sm {
      font-size: 0.875rem;
    }
    
    .text-gray-600 {
      color: #6b7280;
    }
  `]
})
export class CreditLimitModalComponent implements OnInit {
  creditLimitOptions: CreditLimitOption[] = [];
  selectedTimelineId: number | null = null;
  loading = true;
  approving = false;

  constructor(
    public dialogRef: MatDialogRef<CreditLimitModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreditLimitModalData,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadCreditLimitOptions();
  }

  loadCreditLimitOptions(): void {
    this.loading = true;
    this.paymentService.getCreditLimitTimelineOptions().subscribe({
      next: (response) => {
        this.creditLimitOptions = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading credit limit options:', error);
        this.loading = false;
        // You might want to show an error message here
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onApprove(): void {
    if (!this.selectedTimelineId) {
      return;
    }

    this.approving = true;
    this.paymentService.approveTransactionWithCreditLimit(this.data.transaction.id, this.selectedTimelineId).subscribe({
      next: (response) => {
        this.approving = false;
        this.dialogRef.close({ success: true, response });
      },
      error: (error) => {
        console.error('Error approving transaction:', error);
        this.approving = false;
        // You might want to show an error message here
        this.dialogRef.close({ success: false, error });
      }
    });
  }
}