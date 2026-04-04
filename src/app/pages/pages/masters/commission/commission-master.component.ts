import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-commission-master',
  standalone: true,
  templateUrl: './commission-master.component.html',
  styleUrls: ['./commission-master.component.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FormsModule,
    ReactiveFormsModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class CommissionMasterComponent implements OnInit {
  displayedColumns: string[] = [
    'product_name',
    'discount_type',
    'discount',
    'markup_type',
    'markup'
  ];
  dataSource: any[] = [];
  isLoading = false;

  productTypes: string[] = [];
  selectedProductType: string | null = null;

  discountTypeOptions: string[] = ['F', 'P'];
  markupTypeOptions: string[] = ['F', 'P'];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
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
          if (this.productTypes.length && !this.selectedProductType) {
            this.selectedProductType = this.productTypes[0];
          }
          this.loadCommissions();
        },
        error: () => {
          this.productTypes = [];
          this.loadCommissions();
        }
      });
  }

  loadCommissions(): void {
    this.isLoading = true;
    const params: any = { page: 1 };
    if (this.selectedProductType) {
      params.product_type = this.selectedProductType;
    }
    this.http
      .get<any>(`${environment.apiUrl}/commissions/suppliers`, {
        params
      })
      .subscribe({
        next: (res) => {
          this.dataSource = Array.isArray(res?.data) ? res.data : [];
          this.isLoading = false;
        },
        error: () => {
          this.dataSource = [];
          this.isLoading = false;
        }
      });
  }

  onProductTypeChange(): void {
    this.loadCommissions();
  }

  submit(): void {
    if (!this.dataSource || !this.dataSource.length) {
      return;
    }

    this.isLoading = true;
    const payload = this.dataSource.map((row) => ({
      id: row.id,
      product_name: row.product_name,
      discount_type: row.discount_type,
      discount: row.discount,
      markup_type: row.markup_type,
      markup: row.markup
    }));

    this.http
      .put<any>(`${environment.apiUrl}/commissions/suppliers`, payload)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.snackBar.open('Commission updated successfully', 'Close', {
            duration: 3000
          });
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to update commission', 'Close', {
            duration: 3000
          });
        }
      });
  }
}
