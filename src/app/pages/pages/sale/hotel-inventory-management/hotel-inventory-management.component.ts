import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormsModule
} from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';

interface InventoryRow {
  inventory_id: number;
  hotel_name: string;
  check_in_time: string;
  check_out_time: string;
  address?: string | null;
  ranges: { start_date: string; end_date: string }[];
  is_active: number | boolean;
}

@Component({
  selector: 'vex-hotel-inventory-management',
  templateUrl: './hotel-inventory-management.component.html',
  styleUrls: ['./hotel-inventory-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgFor,
    NgIf,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    RouterModule
  ]
})
export class HotelInventoryManagementComponent implements OnInit {
  currentType: string = 'normal';
  filterForm!: FormGroup;
  columns = [
    { label: 'Hotel', property: 'hotel' },
    { label: 'Check In', property: 'checkIn' },
    { label: 'Check Out', property: 'checkOut' },
    { label: 'Address', property: 'address' },
    { label: 'Date Ranges', property: 'ranges' },
    { label: 'Status', property: 'status' },
    { label: 'Actions', property: 'actions' }
  ];

  inventory: InventoryRow[] = [];
  dataSource = new MatTableDataSource<InventoryRow>();
  pageSize = 25;
  pageIndex = 0;
  totalItems = 0;
  pageSizeOptions = [10, 25, 50, 100];
  importFile: File | null = null;
  importDatesError: string = '';
  importing = false;
  selectedInventoryId: number | null = null;
  importDialogRef: MatDialogRef<any> | null = null;
  roomsForImport: Array<{ room_id: number; room_name?: string }> = [];
  roomImportFiles: Record<number, File | null> = {};
  roomImporting: Record<number, boolean> = {};
  roomImportErrors: Record<number, string> = {};
  publicBaseUrl: string = environment.imgUrl;
  tenantOptions: Array<{ id: number; name: string }> = [];
  supplierOptions: Array<{ id: number; label: string }> = [];
  showTenantFilter: boolean = false;
  showSupplierFilter: boolean = false;
  isAdmin: boolean = false;
  isSameState: boolean = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('importDatesTpl') importDatesTpl!: TemplateRef<any>;

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.currentType =
      this.route.snapshot.queryParamMap.get('type') || 'normal';
    this.filterForm = this.fb.group({
      search: [''],
      status: [''],
      tenantId: [null],
      supplierId: [null]
    });
    const rolesRaw = localStorage.getItem('roles') || '[]';
    const roles: string[] = JSON.parse(rolesRaw);
    this.isAdmin = roles.includes('Super Admin') || roles.includes('Admin');
    this.showTenantFilter = this.isAdmin;
    this.showSupplierFilter = this.isAdmin;
    if (this.isAdmin) {
      this.loadTenants();
    }
    this.loadSuppliers();
    this.loadInventory();
    this.route.queryParamMap.subscribe((params) => {
      const nextType = params.get('type') || 'normal';
      if (nextType !== this.currentType) {
        this.currentType = nextType;
        this.loadInventory();
      }
    });
    this.filterForm.get('tenantId')?.valueChanges.subscribe((val) => {
      const tid = val ? Number(val) : null;
      this.filterForm.patchValue({ supplierId: null }, { emitEvent: false });
      this.loadSuppliers(tid || undefined);
      this.loadInventory();
    });
    this.filterForm.get('supplierId')?.valueChanges.subscribe((val) => {
      let sid: number | undefined;
      if (val && typeof val === 'object') {
        const objId = Number((val as any).id);
        sid = isNaN(objId) ? undefined : objId;
      } else if (
        val !== null &&
        val !== undefined &&
        val !== '' &&
        !isNaN(Number(val))
      ) {
        sid = Number(val);
      } else {
        sid = undefined;
      }
      console.log('Supplier id', sid);
      this.filterForm.patchValue(
        { supplierId: sid ?? null },
        { emitEvent: false }
      );
      this.loadInventory();
    });
  }

  get visibleColumns() {
    return this.columns.map((c) => c.property);
  }

  loadInventory() {
    const f = this.filterForm.value;
    const search = (f.search || '').toLowerCase();
    const tid = this.showTenantFilter
      ? f.tenantId
        ? Number(f.tenantId)
        : undefined
      : undefined;
    const rawSupplier = f.supplierId;
    let sid: number | undefined;
    if (rawSupplier && typeof rawSupplier === 'object') {
      const objId = Number((rawSupplier as any).id);
      sid = isNaN(objId) ? undefined : objId;
    } else if (
      rawSupplier !== null &&
      rawSupplier !== undefined &&
      rawSupplier !== '' &&
      !isNaN(Number(rawSupplier))
    ) {
      sid = Number(rawSupplier);
    } else {
      sid = undefined;
    }
    console.log('HotelInventoryManagement.loadInventory filters', {
      tenantId: tid,
      supplierId: sid,
      rawSupplier
    });
    this.hotelService
      .getHotelInventories(this.currentType as any, tid, sid)
      .subscribe({
        next: (res: any) => {
          const rows: InventoryRow[] = (res?.data ?? res ?? []).map(
            (r: any) => ({
              inventory_id: r.inventory_id,
              hotel_name: r.hotel_name,
              check_in_time: r.check_in_time,
              check_out_time: r.check_out_time,
              address: r.address ?? null,
              ranges: Array.isArray(r.ranges) ? r.ranges : [],
              is_active: r.is_active ?? 0
            })
          );
          let filtered = rows.filter((i) => {
            const hay =
              `${i.hotel_name} ${i.check_in_time} ${i.check_out_time} ${i.address ?? ''}`.toLowerCase();
            return !search || hay.includes(search);
          });
          const statusFilter = (f.status || '') as string;
          if (statusFilter === 'active') {
            filtered = filtered.filter(
              (i) => !!(Number(i.is_active) || i.is_active === true)
            );
          } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(
              (i) => !(Number(i.is_active) || i.is_active === true)
            );
          }
          this.inventory = filtered;
          this.dataSource.data = filtered;
          this.totalItems = filtered.length;
          setTimeout(() => {
            if (this.sort) this.dataSource.sort = this.sort;
          });
        },
        error: () => {
          this.inventory = [];
          this.dataSource.data = [];
          this.totalItems = 0;
        }
      });
  }

  loadTenants() {
    this.userService.getTenants(true).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        this.tenantOptions = data.map((t: any) => ({
          id: Number(t.id),
          name: String(t.name || `Tenant #${t.id}`)
        }));
        this.showTenantFilter = this.isAdmin || this.tenantOptions.length > 1;
      },
      error: () => {
        this.tenantOptions = [];
      }
    });
  }

  loadSuppliers(tenantId?: number) {
    this.userService
      .getUsersForAutocomplete('', 'Supplier', tenantId)
      .subscribe({
        next: (res: any) => {
          const rows = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
          this.supplierOptions = rows.map((u: any) => ({
            id: Number(u.id),
            label:
              [u.name, u.email].filter((x) => !!x).join(' ') || `User #${u.id}`
          }));
        },
        error: () => {
          this.supplierOptions = [];
        }
      });
  }

  onPageChange(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
  }

  onToggleStatus(row: InventoryRow) {
    this.hotelService.toggleHotelInventoryStatus(row.inventory_id).subscribe({
      next: (res: any) => {
        const updated = res?.data?.is_active ?? null;
        if (updated !== null) {
          const idx = this.inventory.findIndex(
            (r) => r.inventory_id === row.inventory_id
          );
          if (idx > -1) {
            this.inventory[idx].is_active = updated;
            this.dataSource.data = [...this.inventory];
          }
        }
      },
      error: () => {}
    });
  }

  onEdit(row: InventoryRow) {
    this.router.navigate(['/sale/hotel-inventory-management/edit'], {
      queryParams: { inventory_id: row.inventory_id, type: this.currentType }
    });
  }

  onEditDates(row: InventoryRow) {
    this.router.navigate(
      ['/sale/hotel-inventory-management/edit-date-inventory'],
      {
        queryParams: { inventory_id: row.inventory_id }
      }
    );
  }

  onUpdatePricing(row: InventoryRow) {
    this.router.navigate(['/sale/hotel-inventory-management/update-pricing'], {
      queryParams: { inventory_id: row.inventory_id }
    });
  }

  openImportDates(tpl: TemplateRef<any>, row: InventoryRow) {
    this.selectedInventoryId = row.inventory_id;
    this.importFile = null;
    this.importDatesError = '';
    this.importing = false;
    this.importDialogRef = this.dialog.open(tpl, { width: '520px' });
    this.roomsForImport = [];
    this.roomImportFiles = {};
    this.roomImporting = {};
    this.roomImportErrors = {};
    this.hotelService.getInventoryDates(row.inventory_id).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        this.roomsForImport = data.map((r: any) => ({
          room_id: Number(r.room_id),
          room_name: r.room_name
        }));
        for (const r of this.roomsForImport) {
          this.roomImportFiles[r.room_id] = null;
          this.roomImporting[r.room_id] = false;
          this.roomImportErrors[r.room_id] = '';
        }
      },
      error: () => {
        this.importDatesError = 'Failed to load rooms';
      }
    });
  }

  closeImportDialog() {
    if (this.importDialogRef) this.importDialogRef.close();
    this.importDialogRef = null;
    this.importFile = null;
    this.importing = false;
    this.importDatesError = '';
  }

  onSelectImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files && input.files[0] ? input.files[0] : null;
    this.importFile = f;
    this.importDatesError = '';
  }

  onSelectRoomImportFile(roomId: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files && input.files[0] ? input.files[0] : null;
    this.roomImportFiles[roomId] = f;
    this.roomImportErrors[roomId] = '';
  }

  downloadSampleCSV() {
    const header = 'room_id,date,no_of_room';
    const rows = ['101,2025-01-01,10', '101,2025-01-02,8'];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_dates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  downloadSampleCSVForRoom(roomId: number) {
    const header = 'date,no_of_room';
    const rows = ['2025-01-01,10', '2025-01-02,8'];
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_dates_room_${roomId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  submitImport() {
    if (!this.importFile || !this.selectedInventoryId) {
      this.importDatesError = 'Select a file';
      return;
    }
    this.importing = true;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const dates = this.parseCSVToDates(text);
        if (!dates.length) {
          this.importDatesError = 'No valid rows found';
          this.importing = false;
          return;
        }
        this.hotelService
          .updateInventoryDates(this.selectedInventoryId!, { dates })
          .subscribe({
            next: () => {
              this.importing = false;
              this.closeImportDialog();
              this.loadInventory();
            },
            error: () => {
              this.importing = false;
              this.importDatesError = 'Failed to import';
            }
          });
      } catch {
        this.importing = false;
        this.importDatesError = 'Invalid file format';
      }
    };
    reader.onerror = () => {
      this.importDatesError = 'Failed to read file';
      this.importing = false;
    };
    reader.readAsText(this.importFile);
  }

  submitRoomImport(roomId: number) {
    if (!this.selectedInventoryId) {
      this.roomImportErrors[roomId] = 'Inventory not selected';
      return;
    }
    const file = this.roomImportFiles[roomId];
    if (!file) {
      this.roomImportErrors[roomId] = 'Select a file';
      return;
    }
    this.roomImporting[roomId] = true;
    const form = new FormData();
    form.append('file', file);
    form.append('room_id', String(roomId));
    this.hotelService
      .importInventoryDatesCsv(this.selectedInventoryId!, form)
      .subscribe({
        next: () => {
          this.roomImporting[roomId] = false;
          this.roomImportFiles[roomId] = null;
          this.roomImportErrors[roomId] = '';
          this.loadInventory();
        },
        error: () => {
          this.roomImporting[roomId] = false;
          this.roomImportErrors[roomId] = 'Failed to import';
        }
      });
  }

  parseCSVToDates(text: string): Array<{
    room_id: number;
    date: string;
    no_of_room: number;
  }> {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '');
    if (!lines.length) return [];
    const out: any[] = [];
    let startIdx = 0;
    const first = lines[0].toLowerCase();
    const hasHeader =
      first.includes('room_id') &&
      first.includes('date') &&
      first.includes('no_of_room');
    if (hasHeader) startIdx = 1;
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 3) continue;
      const roomId = Number(cols[0]);
      const date = cols[1];
      const count = Number(cols[2]);
      if (!roomId || !date || isNaN(count)) continue;
      out.push({ room_id: roomId, date, no_of_room: count });
    }
    return out;
  }

  parseRoomCSVToDates(
    roomId: number,
    text: string
  ): Array<{ room_id: number; date: string; no_of_room: number }> {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '');
    if (!lines.length) return [];
    const out: any[] = [];
    let startIdx = 0;
    const first = lines[0].toLowerCase();
    const hasThree =
      first.includes('room_id') &&
      first.includes('date') &&
      first.includes('no_of_room');
    const hasTwo =
      !hasThree &&
      first.includes('date') &&
      first.includes('no_of_room') &&
      !first.includes('room_id');
    if (hasThree || hasTwo) startIdx = 1;
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (hasThree) {
        if (cols.length < 3) continue;
        const rid = Number(cols[0]);
        const date = cols[1];
        const count = Number(cols[2]);
        if (!rid || !date || isNaN(count)) continue;
        if (rid !== roomId) continue;
        out.push({ room_id: rid, date, no_of_room: count });
      } else {
        if (cols.length < 2) continue;
        const date = cols[0];
        const count = Number(cols[1]);
        if (!date || isNaN(count)) continue;
        out.push({ room_id: roomId, date, no_of_room: count });
      }
    }
    return out;
  }
}
