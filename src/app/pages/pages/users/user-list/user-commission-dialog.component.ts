import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-user-commission-dialog',
  standalone: true,
  template: `
    <h2 mat-dialog-title>User Commission</h2>
    <mat-dialog-content>
      <div class="commission-dialog">
        <div class="field-row">
          <label>Product Type</label>
          <mat-form-field appearance="outline">
            <mat-select
              [(ngModel)]="selectedProductType"
              (selectionChange)="onProductTypeChange()">
              <mat-option *ngFor="let pt of productTypes" [value]="pt">
                {{ pt }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="field-row">
          <label>Status</label>
          <mat-form-field appearance="outline">
            <mat-select [(ngModel)]="data.is_active">
              <mat-option [value]="1">Active</mat-option>
              <mat-option [value]="0">Inactive</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="field-row">
          <label>Discount Type</label>
          <mat-form-field appearance="outline">
            <mat-select [(ngModel)]="data.discount_type">
              <mat-option value="F">F</mat-option>
              <mat-option value="P">P</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="field-row">
          <label>Discount</label>
          <mat-form-field appearance="outline">
            <input matInput type="number" [(ngModel)]="data.discount" />
          </mat-form-field>
        </div>

        <div class="field-row">
          <label>Markup Type</label>
          <mat-form-field appearance="outline">
            <mat-select [(ngModel)]="data.markup_type">
              <mat-option value="F">F</mat-option>
              <mat-option value="P">P</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="field-row">
          <label>Markup</label>
          <mat-form-field appearance="outline">
            <input matInput type="number" [(ngModel)]="data.markup" />
          </mat-form-field>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .commission-dialog {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 320px;
      }
      .field-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .field-row label {
        width: 120px;
        font-size: 12px;
      }
      .field-row mat-form-field {
        flex: 1;
      }
    `
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    HttpClientModule
  ]
})
export class UserCommissionDialogComponent implements OnInit {
  productTypes: string[] = [];
  selectedProductType: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<UserCommissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (this.data) {
      if (this.data.is_active === undefined || this.data.is_active === null) {
        this.data.is_active = 1;
      } else {
        this.data.is_active = Number(this.data.is_active);
      }
    }
    this.loadProductTypes();
  }

  loadProductTypes(): void {
    this.http
      .get<any>(`${environment.apiUrl}/commissions/product-types`)
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.productTypes = list.map((p: any) => String(p));

          if (!this.selectedProductType && this.productTypes.length) {
            this.selectedProductType = this.productTypes[0];
          }

          this.loadUserCommission();
        },
        error: () => {
          this.productTypes = [];
          this.loadUserCommission();
        }
      });
  }

  loadUserCommission(): void {
    const userId = this.data?.user_id;
    if (!userId) {
      return;
    }

    const params: any = {};
    if (this.selectedProductType) {
      params.product_type = this.selectedProductType;
    }

    this.http
      .get<any>(`${environment.apiUrl}/commissions/user/${userId}`, {
        params
      })
      .subscribe({
        next: (res) => {
          let src: any = res?.data ?? res;
          if (Array.isArray(src)) {
            src = src[0] || {};
          }

          if (src.is_active !== undefined && src.is_active !== null) {
            this.data.is_active = Number(src.is_active);
          } else if (
            this.data.is_active === undefined ||
            this.data.is_active === null
          ) {
            this.data.is_active = 1;
          }

          this.data.discount_type =
            src.discount_type ?? this.data.discount_type ?? 'F';
          this.data.discount = src.discount ?? this.data.discount ?? 0;
          this.data.commission_type =
            src.commission_type ?? this.data.commission_type ?? 'included';
          this.data.markup_type =
            src.markup_type ?? this.data.markup_type ?? 'F';
          this.data.markup = src.markup ?? this.data.markup ?? 0;
        },
        error: () => {}
      });
  }

  onProductTypeChange(): void {
    this.loadUserCommission();
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    const payload = [
      {
        user_id: this.data.user_id,
        product_type: this.selectedProductType,
        is_active: this.data.is_active,
        discount_type: this.data.discount_type,
        discount: this.data.discount,
        markup_type: this.data.markup_type,
        markup: this.data.markup
      }
    ];

    this.http
      .put<any>(`${environment.apiUrl}/commissions/suppliers`, payload)
      .subscribe({
        next: () => {
          this.dialogRef.close(payload);
        },
        error: () => {
          this.dialogRef.close(null);
        }
      });
  }
}
