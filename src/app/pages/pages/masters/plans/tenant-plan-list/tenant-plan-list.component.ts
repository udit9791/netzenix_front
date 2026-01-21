import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlanService } from '../../../../../services/plan.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogModule
} from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-tenant-plan-list',
  standalone: true,
  templateUrl: './tenant-plan-list.component.html',
  styleUrls: ['./tenant-plan-list.component.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ConfirmDialogModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class TenantPlanListComponent implements OnInit {
  displayedColumns: string[] = [
    'tenant',
    'name',
    'user_type',
    'price',
    'is_active',
    'actions'
  ];
  dataSource: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  searchQuery = '';
  userTypeFilter: '' | 'buyer' | 'seller' = '';
  isLoading = false;

  planForm!: FormGroup;
  dialogMode: 'add' | 'edit' = 'add';
  editingPlan: any | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('planFormDialog') planFormDialog!: TemplateRef<any>;

  constructor(
    private planService: PlanService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.planForm = this.fb.group({
      name: ['', Validators.required],
      user_type: ['buyer', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      is_active: [true]
    });
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.planService
      .getTenantPlans(
        this.currentPage + 1,
        this.pageSize,
        this.sortField,
        this.sortOrder,
        this.searchQuery,
        this.userTypeFilter || undefined
      )
      .subscribe({
        next: (res: any) => {
          this.dataSource = res?.data || [];
          this.totalItems = res?.total || this.dataSource.length;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to load plans', 'Close', {
            duration: 3000
          });
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadPlans();
  }

  onSortChange(): void {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = (this.sort.direction || 'asc') as 'asc' | 'desc';
      this.loadPlans();
    }
  }

  applyFilter(): void {
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPlans();
  }

  onUserTypeFilterChange(value: '' | 'buyer' | 'seller'): void {
    this.userTypeFilter = value;
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPlans();
  }

  openAddDialog(): void {
    this.dialogMode = 'add';
    this.editingPlan = null;
    this.planForm.reset({
      name: '',
      user_type: 'buyer',
      price: 0,
      is_active: true
    });
    this.dialog.open(this.planFormDialog, {
      width: '450px'
    });
  }

  openEditDialog(plan: any): void {
    this.dialogMode = 'edit';
    this.editingPlan = plan;
    this.planForm.reset({
      name: plan.name || '',
      user_type: plan.user_type || 'buyer',
      price: plan.price || 0,
      is_active: !!plan.is_active
    });
    this.dialog.open(this.planFormDialog, {
      width: '450px'
    });
  }

  savePlan(): void {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    const payload = {
      name: this.planForm.value.name,
      user_type: this.planForm.value.user_type,
      price: Number(this.planForm.value.price),
      is_active: !!this.planForm.value.is_active
    };

    if (this.dialogMode === 'add') {
      this.planService.createTenantPlan(payload).subscribe({
        next: () => {
          this.snackBar.open('Plan created successfully', 'Close', {
            duration: 3000
          });
          this.dialog.closeAll();
          this.loadPlans();
        },
        error: () => {
          this.snackBar.open('Failed to create plan', 'Close', {
            duration: 3000
          });
        }
      });
    } else if (this.editingPlan) {
      this.planService
        .updateTenantPlan(this.editingPlan.id, payload)
        .subscribe({
          next: () => {
            this.snackBar.open('Plan updated successfully', 'Close', {
              duration: 3000
            });
            this.dialog.closeAll();
            this.loadPlans();
          },
          error: () => {
            this.snackBar.open('Failed to update plan', 'Close', {
              duration: 3000
            });
          }
        });
    }
  }

  toggleStatus(plan: any): void {
    this.planService.toggleTenantPlanStatus(plan.id).subscribe({
      next: () => {
        plan.is_active = plan.is_active ? 0 : 1;
        this.snackBar.open('Plan status updated', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to update plan status', 'Close', {
          duration: 3000
        });
      }
    });
  }

  deletePlan(plan: any): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this plan?'
      }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.planService.deleteTenantPlan(plan.id).subscribe({
          next: () => {
            this.snackBar.open('Plan deleted successfully', 'Close', {
              duration: 3000
            });
            this.loadPlans();
          },
          error: () => {
            this.snackBar.open('Failed to delete plan', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }
}
