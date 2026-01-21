import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
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
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlanService } from '../../../../../services/plan.service';
import { UserService } from '../../../../../core/services/user.service';
import { ConfirmDialogComponent, ConfirmDialogModule } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-user-plan-list',
  standalone: true,
  templateUrl: './user-plan-list.component.html',
  styleUrls: ['./user-plan-list.component.scss'],
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
export class UserPlanListComponent implements OnInit {
  displayedColumns: string[] = [
    'tenant',
    'user',
    'plan',
    'starts_at',
    'ends_at',
    'is_active',
    'actions'
  ];
  dataSource: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'starts_at';
  sortOrder: 'asc' | 'desc' = 'desc';
  isLoading = false;

  tenantOptions: Array<{ id: number; name: string }> = [];
  selectedTenantId: number | null = null;

  subscriptionForm!: FormGroup;
  dialogMode: 'add' | 'edit' = 'add';
  editingSubscription: any | null = null;

  selectedUser: any | null = null;
  userSearch = '';
  userOptions: any[] = [];

  planOptions: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('subscriptionFormDialog') subscriptionFormDialog!: TemplateRef<any>;

  constructor(
    private planService: PlanService,
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.subscriptionForm = this.fb.group({
      tenant_id: [null],
      user_id: [null, Validators.required],
      tenant_user_plan_id: [null, Validators.required],
      starts_at: ['', Validators.required],
      ends_at: [''],
      is_active: [true]
    });
    this.loadTenants();
    this.loadSubscriptions();
  }

  loadTenants(): void {
    this.userService.getTenants(true).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.tenantOptions = data.map((t: any) => ({
          id: Number(t.id),
          name: String(t.name || `Tenant #${t.id}`)
        }));
      },
      error: () => {
        this.tenantOptions = [];
      }
    });
  }

  loadSubscriptions(): void {
    this.isLoading = true;
    this.planService
      .getUserSubscriptions(
        this.currentPage + 1,
        this.pageSize,
        this.sortField,
        this.sortOrder,
        this.selectedTenantId || undefined
      )
      .subscribe({
        next: (res: any) => {
          this.dataSource = res?.data || [];
          this.totalItems = res?.total || this.dataSource.length;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to load user plans', 'Close', {
            duration: 3000
          });
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadSubscriptions();
  }

  onSortChange(): void {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = (this.sort.direction || 'desc') as 'asc' | 'desc';
      this.loadSubscriptions();
    }
  }

  onTenantFilterChange(id: number | null): void {
    this.selectedTenantId = id;
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadSubscriptions();
  }

  openAddDialog(): void {
    this.dialogMode = 'add';
    this.editingSubscription = null;
    this.selectedUser = null;
    this.userSearch = '';
    this.userOptions = [];
    this.planOptions = [];
    this.subscriptionForm.reset({
      tenant_id: this.selectedTenantId,
      user_id: null,
      tenant_user_plan_id: null,
      starts_at: '',
      ends_at: '',
      is_active: true
    });
    this.dialog.open(this.subscriptionFormDialog, {
      width: '520px'
    });
  }

  openEditDialog(row: any): void {
    this.dialogMode = 'edit';
    this.editingSubscription = row;
    this.selectedTenantId = row.tenant_id || null;
    this.selectedUser = row.user || null;
    this.userSearch = row.user?.name || '';
    this.userOptions = row.user ? [row.user] : [];
    this.planOptions = row.plan ? [row.plan] : [];
    this.subscriptionForm.reset({
      tenant_id: row.tenant_id || null,
      user_id: row.user_id,
      tenant_user_plan_id: row.tenant_user_plan_id,
      starts_at: row.starts_at ? String(row.starts_at).substring(0, 10) : '',
      ends_at: row.ends_at ? String(row.ends_at).substring(0, 10) : '',
      is_active: !!row.is_active
    });
    this.dialog.open(this.subscriptionFormDialog, {
      width: '520px'
    });
  }

  searchUsers(): void {
    const query = this.userSearch.trim();
    if (!query) {
      this.userOptions = [];
      return;
    }
    const tenantId =
      this.subscriptionForm.value.tenant_id !== null &&
      this.subscriptionForm.value.tenant_id !== undefined
        ? Number(this.subscriptionForm.value.tenant_id)
        : undefined;
    this.userService.getUsersForAutocomplete(query, undefined, tenantId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.userOptions = rows;
      },
      error: () => {
        this.userOptions = [];
      }
    });
  }

  onUserSelected(user: any): void {
    this.selectedUser = user;
    this.subscriptionForm.patchValue({ user_id: user.id });
  }

  loadPlansForTenant(): void {
    const tenantId =
      this.subscriptionForm.value.tenant_id !== null &&
      this.subscriptionForm.value.tenant_id !== undefined
        ? Number(this.subscriptionForm.value.tenant_id)
        : undefined;
    this.planService
      .getTenantPlans(1, 100, 'name', 'asc', '', undefined)
      .subscribe({
        next: (res: any) => {
          const rows = res?.data || [];
          this.planOptions = rows.filter((p: any) =>
            tenantId ? p.tenant_id === tenantId : true
          );
        },
        error: () => {
          this.planOptions = [];
        }
      });
  }

  saveSubscription(): void {
    if (this.subscriptionForm.invalid) {
      this.subscriptionForm.markAllAsTouched();
      return;
    }
    const payload = {
      user_id: Number(this.subscriptionForm.value.user_id),
      tenant_user_plan_id: Number(this.subscriptionForm.value.tenant_user_plan_id),
      starts_at: this.subscriptionForm.value.starts_at,
      ends_at: this.subscriptionForm.value.ends_at || null,
      is_active: !!this.subscriptionForm.value.is_active
    };
    if (this.dialogMode === 'add') {
      this.planService.createUserSubscription(payload).subscribe({
        next: () => {
          this.snackBar.open('User plan created successfully', 'Close', {
            duration: 3000
          });
          this.dialog.closeAll();
          this.loadSubscriptions();
        },
        error: () => {
          this.snackBar.open('Failed to create user plan', 'Close', {
            duration: 3000
          });
        }
      });
    } else if (this.editingSubscription) {
      this.planService
        .updateUserSubscription(this.editingSubscription.id, payload)
        .subscribe({
          next: () => {
            this.snackBar.open('User plan updated successfully', 'Close', {
              duration: 3000
            });
            this.dialog.closeAll();
            this.loadSubscriptions();
          },
          error: () => {
            this.snackBar.open('Failed to update user plan', 'Close', {
              duration: 3000
            });
          }
        });
    }
  }

  toggleStatus(row: any): void {
    this.planService.toggleUserSubscriptionStatus(row.id).subscribe({
      next: () => {
        row.is_active = row.is_active ? 0 : 1;
        this.snackBar.open('User plan status updated', 'Close', {
          duration: 3000
        });
      },
      error: () => {
        this.snackBar.open('Failed to update user plan status', 'Close', {
          duration: 3000
        });
      }
    });
  }

  deleteSubscription(row: any): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this user plan?'
      }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.planService.deleteUserSubscription(row.id).subscribe({
          next: () => {
            this.snackBar.open('User plan deleted successfully', 'Close', {
              duration: 3000
            });
            this.loadSubscriptions();
          },
          error: () => {
            this.snackBar.open('Failed to delete user plan', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }
}

