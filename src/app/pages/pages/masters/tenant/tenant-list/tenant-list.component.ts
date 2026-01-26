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
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TenantService } from '../../../../../services/tenant.service';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.scss'],
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
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class TenantListComponent implements OnInit {
  displayedColumns: string[] = [
    'name',
    'slug',
    'domain',
    'is_active',
    'actions'
  ];
  dataSource: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'id';
  sortOrder: 'asc' | 'desc' = 'asc';
  searchQuery = '';
  isLoading = false;

  tenantForm!: FormGroup;
  dialogMode: 'add' | 'edit' = 'add';
  editingTenant: any | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tenantFormDialog') tenantFormDialog!: TemplateRef<any>;

  constructor(
    private tenantService: TenantService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.tenantForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      slug: ['', [Validators.maxLength(255)]],
      domain: ['', [Validators.required, Validators.maxLength(255)]],
      is_active: [true],
      logo: [null]
    });
    this.loadTenants();
  }

  loadTenants(): void {
    this.isLoading = true;
    this.tenantService
      .getTenants(
        this.currentPage + 1,
        this.pageSize,
        this.searchQuery,
        this.sortField,
        this.sortOrder
      )
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.dataSource = rows;
          this.totalItems = res?.total || rows.length;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Failed to load tenants', 'Close', {
            duration: 3000
          });
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadTenants();
  }

  onSortChange(): void {
    if (this.sort) {
      this.sortField = this.sort.active;
      this.sortOrder = (this.sort.direction || 'asc') as 'asc' | 'desc';
      this.loadTenants();
    }
  }

  applyFilter(): void {
    this.currentPage = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadTenants();
  }

  openAddDialog(): void {
    this.dialogMode = 'add';
    this.editingTenant = null;
    this.tenantForm.reset({
      name: '',
      slug: '',
      domain: '',
      is_active: true,
      logo: null
    });
    this.dialog.open(this.tenantFormDialog, {
      width: '450px'
    });
  }

  openEditDialog(row: any): void {
    this.dialogMode = 'edit';
    this.editingTenant = row;
    this.tenantForm.reset({
      name: row.name || '',
      slug: row.slug || '',
      domain: row.domain || '',
      is_active: !!row.is_active,
      logo: null
    });
    this.dialog.open(this.tenantFormDialog, {
      width: '450px'
    });
  }

  saveTenant(): void {
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      return;
    }

    const formValue = this.tenantForm.value;
    const payload = new FormData();
    payload.append('name', formValue.name);
    if (formValue.slug) {
      payload.append('slug', formValue.slug);
    }
    payload.append('domain', formValue.domain);
    payload.append('is_active', formValue.is_active ? '1' : '0');
    const logoFile: File | null = formValue.logo || null;
    if (logoFile) {
      payload.append('logo', logoFile);
    }

    if (this.dialogMode === 'add') {
      this.tenantService.createTenant(payload).subscribe({
        next: () => {
          this.snackBar.open('Tenant created successfully', 'Close', {
            duration: 3000
          });
          this.dialog.closeAll();
          this.loadTenants();
        },
        error: () => {
          this.snackBar.open('Failed to create tenant', 'Close', {
            duration: 3000
          });
        }
      });
    } else if (this.editingTenant) {
      this.tenantService
        .updateTenant(this.editingTenant.id, payload)
        .subscribe({
          next: () => {
            this.snackBar.open('Tenant updated successfully', 'Close', {
              duration: 3000
            });
            this.dialog.closeAll();
            this.loadTenants();
          },
          error: () => {
            this.snackBar.open('Failed to update tenant', 'Close', {
              duration: 3000
            });
          }
        });
    }
  }

  toggleStatus(row: any): void {
    const payload = {
      name: row.name,
      slug: row.slug || null,
      domain: row.domain,
      is_active: !row.is_active
    };
    this.tenantService.updateTenant(row.id, payload).subscribe({
      next: () => {
        row.is_active = !row.is_active;
        this.snackBar.open('Tenant status updated', 'Close', {
          duration: 3000
        });
      },
      error: () => {
        this.snackBar.open('Failed to update tenant status', 'Close', {
          duration: 3000
        });
      }
    });
  }

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.tenantForm.get('logo')?.setValue(file);
  }
}
