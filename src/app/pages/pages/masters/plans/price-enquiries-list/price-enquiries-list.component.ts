import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PlanService } from '../../../../../services/plan.service';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-price-enquiries-list',
  standalone: true,
  templateUrl: './price-enquiries-list.component.html',
  styleUrls: ['./price-enquiries-list.component.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    FormsModule,
    RouterModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class PriceEnquiriesListComponent implements OnInit {
  displayedColumns: string[] = [
    'id',
    'plan_name',
    'name',
    'email',
    'phone',
    'business_type',
    'status',
    'message',
    'created_at',
    'actions'
  ];

  rawData: any[] = [];
  filteredData: any[] = [];
  pagedData: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  searchQuery = '';
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private planService: PlanService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEnquiries();
  }

  loadEnquiries(): void {
    this.isLoading = true;
    this.planService.getPricingEnquiries().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        this.rawData = rows;
        this.updateFilteredData();
        this.isLoading = false;
      },
      error: () => {
        this.rawData = [];
        this.filteredData = [];
        this.pagedData = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.snackBar.open('Failed to load price enquiries', 'Close', {
          duration: 3000
        });
      }
    });
  }

  applyFilter(): void {
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.updateFilteredData();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.updatePagedData();
  }

  formatPhone(row: any): string {
    const cc = row.country_code ? String(row.country_code).trim() : '';
    const ph = row.phone ? String(row.phone).trim() : '';
    if (cc && ph) {
      return `${cc} ${ph}`;
    }
    return ph || cc || '';
  }

  private updateFilteredData(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredData = [...this.rawData];
    } else {
      this.filteredData = this.rawData.filter((row) => {
        const haystack = `${row.plan_name || ''} ${row.name || ''} ${
          row.email || ''
        } ${row.phone || ''} ${row.business_type || ''}`.toLowerCase();
        return haystack.includes(query);
      });
    }
    this.totalItems = this.filteredData.length;
    this.updatePagedData();
  }

  private updatePagedData(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.pagedData = this.filteredData.slice(start, end);
  }

  viewDetails(row: any): void {
    if (!row || row.id === undefined || row.id === null) {
      return;
    }
    this.router.navigate(['/masters/price-enquiries', row.id]);
  }
}
