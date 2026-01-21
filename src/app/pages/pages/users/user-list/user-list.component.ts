import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { TableColumn } from '@vex/interfaces/table-column.interface';
import { SelectionModel } from '@angular/cdk/collections';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormControl,
  FormControl
} from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// VEX UI imports
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { UserService } from 'src/app/core/services/user.service';
import { Router } from '@angular/router';
import { UserDetailDialogComponent } from './user-detail-dialog.component';

export interface User {
  id: number;
  imageSrc?: string;
  name: string;
  email: string;
  role_names?: string[];
  is_active?: number;
  labels?: any[];
}

@Component({
  selector: 'vex-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  animations: [fadeInUp400ms, stagger40ms],
  standalone: true,
  imports: [
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexBreadcrumbsComponent,
    MatButtonToggleModule,
    ReactiveFormsModule,
    VexPageLayoutContentDirective,
    NgIf,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    NgFor,
    NgClass,
    MatPaginatorModule,
    FormsModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule
  ]
})
export class UserListComponent implements OnInit, AfterViewInit {
  layoutCtrl = new UntypedFormControl('boxed');
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  totalUsers = 0;
  pageIndex = 0; // track paginator index

  users: User[] = [];
  dataSource = new MatTableDataSource<User>();

  // ✅ Expose Array so template can use it
  readonly Array = Array;

  @Input()
  columns: TableColumn<User>[] = [
    {
      label: 'Checkbox',
      property: 'checkbox',
      type: 'checkbox',
      visible: true
    },
    {
      label: 'Name',
      property: 'name',
      type: 'text',
      visible: true,
      cssClasses: ['font-medium']
    },
    {
      label: 'Email',
      property: 'email',
      type: 'text',
      visible: true,
      cssClasses: ['text-secondary']
    },
    {
      label: 'Role',
      property: 'role_names',
      type: 'text',
      visible: true,
      cssClasses: ['text-secondary']
    },
    {
      label: 'Status',
      property: 'is_active',
      type: 'badge',
      visible: true,
      cssClasses: ['text-secondary']
    },
    { label: 'Actions', property: 'actions', type: 'button', visible: true }
  ];

  searchCtrl = new UntypedFormControl();
  selection = new SelectionModel<User>(true, []);

  isMaster: boolean = false;
  isAdmin: boolean = false;
  showTenantFilter: boolean = false;
  tenantCtrl = new FormControl<number | null>(null);
  tenantOptions: Array<{ id: number; name: string }> = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private router: Router
  ) {}

  get visibleColumns() {
    return this.columns.filter((c) => c.visible).map((c) => c.property);
  }

  ngOnInit() {
    const isMasterRaw = localStorage.getItem('is_master');
    this.isMaster = isMasterRaw === '1' || isMasterRaw === 'true';
    const rolesRaw = localStorage.getItem('roles') || '[]';
    const roles: string[] = JSON.parse(rolesRaw);
    this.isAdmin = roles.includes('Super Admin') || roles.includes('Admin');
    this.showTenantFilter = this.isMaster || this.isAdmin;
    if (this.showTenantFilter) {
      this.loadTenants();
      this.tenantCtrl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.pageIndex = 0;
          if (this.paginator) {
            this.paginator.firstPage();
          }
          this.loadUsers(this.searchCtrl.value);
        });
    }

    this.loadUsers();

    this.searchCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.pageIndex = 0;
        this.paginator.firstPage();
        this.loadUsers(value);
      });
  }

  ngAfterViewInit() {
    // Pagination
    this.paginator.page.subscribe((event: PageEvent) => {
      this.pageIndex = event.pageIndex;
      this.loadUsers(
        this.searchCtrl.value,
        event.pageIndex + 1,
        event.pageSize,
        this.sort.active || 'id',
        (this.sort.direction as 'asc' | 'desc') || 'asc'
      );
    });

    // Sorting
    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.paginator.firstPage();
      this.loadUsers(
        this.searchCtrl.value,
        1,
        this.paginator.pageSize,
        this.sort.active || 'id',
        (this.sort.direction as 'asc' | 'desc') || 'asc'
      );
    });
  }

  /** ✅ Load users from API */
  loadUsers(
    search: string = '',
    page: number = 1,
    perPage: number = this.pageSize,
    sortField: string = 'id',
    sortDirection: 'asc' | 'desc' = 'asc'
  ) {
    const tenantId =
      this.showTenantFilter &&
      this.tenantCtrl.value !== null &&
      this.tenantCtrl.value !== undefined
        ? Number(this.tenantCtrl.value)
        : undefined;
    this.userService
      .getUsers(page, perPage, search, sortField, sortDirection, tenantId)
      .subscribe((res) => {
        this.users = res.data;
        this.dataSource.data = this.users;
        this.totalUsers = res.total;
        this.pageIndex = page - 1;
      });
  }

  createUser() {
    this.router.navigate(['/users/create']);
  }

  updateUser(user: User) {
    this.router.navigate(['/users/edit', user.id]);
  }

  deleteUser(user: User) {
    this.userService.deleteUser(user.id).subscribe(() => {
      this.loadUsers(
        this.searchCtrl.value,
        this.pageIndex + 1,
        this.paginator.pageSize
      );
    });
  }

  deleteUsers(users: User[]) {
    users.forEach((u) => this.deleteUser(u));
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  trackByProperty<T>(index: number, column: TableColumn<T>) {
    return column.property;
  }

  viewUser(user: User) {
    this.dialog
      .open(UserDetailDialogComponent, {
        width: '800px',
        data: { id: user.id }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.loadUsers(
            this.searchCtrl.value,
            this.pageIndex + 1,
            this.paginator.pageSize,
            this.sort.active || 'id',
            (this.sort.direction as 'asc' | 'desc') || 'asc'
          );
        }
      });
  }

  loadTenants(): void {
    this.userService.getTenants(true).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        this.tenantOptions = data
          .map((t: any) => ({
            id: Number(t.id),
            name: String(t.name || `Tenant #${t.id}`)
          }))
          .filter(
            (t: { id: number; name: string }) => t.id > 0 && t.name !== ''
          );
      },
      error: () => {
        this.tenantOptions = [];
      }
    });
  }
}
