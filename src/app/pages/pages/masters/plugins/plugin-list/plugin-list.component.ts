import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PluginService } from '../../../../../services/plugin.service';
import { TenantService } from '../../../../../services/tenant.service';
import { PluginEditDialogComponent } from '../plugin-edit-dialog/plugin-edit-dialog.component';

@Component({
  selector: 'app-plugin-list',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatTooltipModule, MatInputModule, MatSelectModule,
    MatFormFieldModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDialogModule, NgIf, NgFor, NgClass, FormsModule
  ],
  template: `
    <div class="p-6 max-w-6xl mx-auto space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">Plugins</h1>
        <button *ngIf="isAdmin" mat-raised-button color="primary" (click)="openMasterDialog(null)">
          <mat-icon>add</mat-icon> New Plugin
        </button>
      </div>

      <!-- Admin: search + global tenant dropdown -->
      <div *ngIf="isAdmin" class="flex flex-wrap gap-3 items-end">
        <mat-form-field class="w-72" subscriptSizing="dynamic">
          <mat-label>Search plugins</mat-label>
          <input matInput [(ngModel)]="search" (ngModelChange)="onSearch()" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field class="w-64" subscriptSizing="dynamic">
          <mat-label>Select Tenant</mat-label>
          <mat-select [(ngModel)]="selectedTenantId" (ngModelChange)="onTenantChange()">
            <mat-option [value]="null">— All Plugins (no tenant) —</mat-option>
            <mat-option *ngFor="let t of tenants" [value]="t.id">{{ t.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <p *ngIf="selectedTenantId" class="text-xs text-blue-600 self-center">
          Showing plugin values for selected tenant
        </p>
      </div>

      <div *ngIf="loading" class="flex justify-center py-12">
        <mat-spinner diameter="48"></mat-spinner>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!-- ADMIN TABLE                                        -->
      <!-- ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="!loading && isAdmin">
        <table mat-table [dataSource]="adminPlugins" class="w-full shadow-sm rounded">

          <!-- Name / Description -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Name</th>
            <td mat-cell *matCellDef="let p">
              <div class="font-medium">{{ p.name }}</div>
              <div class="text-xs text-gray-400">{{ p.description }}</div>
            </td>
          </ng-container>

          <!-- Status -->
          <ng-container matColumnDef="is_active">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Status</th>
            <td mat-cell *matCellDef="let p">
              <span class="px-2 py-1 rounded-full text-xs font-semibold"
                    [ngClass]="p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ p.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </ng-container>

          <!-- Tenant values (shown only when tenant selected) -->
          <ng-container matColumnDef="tenant_status">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Tenant Active</th>
            <td mat-cell *matCellDef="let p">
              <ng-container *ngIf="selectedTenantId && p.tenantPlugin !== undefined; else noTenantCell">
                <span class="px-2 py-1 rounded-full text-xs font-semibold"
                      [ngClass]="p.tenantPlugin?.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                  {{ p.tenantPlugin?.is_active ? 'On' : 'Off' }}
                </span>
              </ng-container>
              <ng-template #noTenantCell><span class="text-xs text-gray-300">—</span></ng-template>
            </td>
          </ng-container>

          <!-- Lock state -->
          <ng-container matColumnDef="lock_status">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Locked</th>
            <td mat-cell *matCellDef="let p">
              <ng-container *ngIf="selectedTenantId && p.tenantPlugin !== undefined; else noLockCell">
                <mat-icon class="!text-base"
                  [class.text-amber-500]="p.tenantPlugin?.is_locked_by_master"
                  [class.text-gray-300]="!p.tenantPlugin?.is_locked_by_master"
                  [matTooltip]="p.tenantPlugin?.is_locked_by_master ? 'Locked by admin' : 'Unlocked'">
                  {{ p.tenantPlugin?.is_locked_by_master ? 'lock' : 'lock_open' }}
                </mat-icon>
              </ng-container>
              <ng-template #noLockCell><span class="text-xs text-gray-300">—</span></ng-template>
            </td>
          </ng-container>

          <!-- Configure tenant values -->
          <ng-container matColumnDef="configure">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Configure</th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button color="primary"
                      [disabled]="!selectedTenantId"
                      (click)="openAdminCredentialsDialog(p)"
                      [matTooltip]="selectedTenantId ? 'Configure tenant values' : 'Select a tenant first'">
                <mat-icon>settings</mat-icon>
              </button>
            </td>
          </ng-container>

          <!-- Edit schema -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button (click)="openMasterDialog(p)" matTooltip="Edit plugin schema">
                <mat-icon>edit</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="adminCols"></tr>
          <tr mat-row *matRowDef="let row; columns: adminCols;" class="hover:bg-gray-50"></tr>
        </table>

        <mat-paginator [length]="adminTotal" [pageSize]="adminPageSize"
                       [pageSizeOptions]="[10,15,25]" (page)="onAdminPage($event)"
                       showFirstLastButtons></mat-paginator>
      </ng-container>

      <!-- ══════════════════════════════════════════════════ -->
      <!-- TENANT TABLE                                       -->
      <!-- ══════════════════════════════════════════════════ -->
      <ng-container *ngIf="!loading && !isAdmin">
        <table mat-table [dataSource]="tenantPlugins" class="w-full shadow-sm rounded">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Plugin</th>
            <td mat-cell *matCellDef="let p">
              <div class="font-medium">{{ p.name }}</div>
              <div class="text-xs text-gray-400">{{ p.description }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="is_active">
            <th mat-header-cell *matHeaderCellDef class="text-xs uppercase text-gray-500">Active</th>
            <td mat-cell *matCellDef="let p">
              <mat-slide-toggle
                [checked]="p.is_active"
                [disabled]="p.is_locked_by_master"
                (change)="togglePlugin(p)">
              </mat-slide-toggle>
            </td>
          </ng-container>

          <ng-container matColumnDef="lock">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <mat-icon *ngIf="p.is_locked_by_master" class="text-amber-500" matTooltip="Locked by admin">lock</mat-icon>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button
                      [disabled]="p.is_locked_by_master"
                      (click)="openCredentialsDialog(p)"
                      matTooltip="Configure credentials">
                <mat-icon>settings</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="tenantCols"></tr>
          <tr mat-row *matRowDef="let row; columns: tenantCols;" class="hover:bg-gray-50"></tr>
        </table>

        <p *ngIf="!tenantPlugins.length" class="text-center py-8 text-gray-400">No plugins available.</p>
      </ng-container>
    </div>
  `
})
export class PluginListComponent implements OnInit {
  isAdmin = false;
  loading = true;
  search = '';

  // Admin
  adminPlugins: any[] = [];
  adminTotal = 0;
  adminPage = 1;
  adminPageSize = 15;
  adminCols = ['name', 'is_active', 'tenant_status', 'lock_status', 'configure', 'actions'];

  tenants: { id: number; name: string }[] = [];
  selectedTenantId: number | null = null;

  // Tenant
  tenantPlugins: any[] = [];
  tenantCols = ['name', 'is_active', 'lock', 'actions'];

  constructor(
    private pluginService: PluginService,
    private tenantService: TenantService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const roles: string[] = JSON.parse(localStorage.getItem('roles') || '[]');
    this.isAdmin = roles.includes('Super Admin') || roles.includes('Admin');
    if (this.isAdmin) this.loadTenants();
    this.load();
  }

  private loadTenants(): void {
    this.tenantService.getTenants(1, 200).subscribe({
      next: (res) => { this.tenants = res.data ?? []; },
      error: () => {}
    });
  }

  private load(): void {
    this.loading = true;
    if (this.isAdmin) {
      this.pluginService.getPlugins(this.adminPage, this.adminPageSize, this.search).subscribe({
        next: (res) => {
          this.adminPlugins = res.data ?? [];
          this.adminTotal   = res.total ?? 0;
          this.loading = false;
          if (this.selectedTenantId) this.enrichWithTenantData();
        },
        error: () => { this.loading = false; }
      });
    } else {
      this.pluginService.getMyPlugins().subscribe({
        next: (res) => { this.tenantPlugins = res.data ?? []; this.loading = false; },
        error: () => { this.loading = false; }
      });
    }
  }

  // When tenant changes: re-enrich rows with that tenant's plugin values
  onTenantChange(): void {
    if (!this.selectedTenantId) {
      this.adminPlugins = this.adminPlugins.map(p => ({ ...p, tenantPlugin: undefined }));
      return;
    }
    this.enrichWithTenantData();
  }

  // Fetch each plugin's tenant row in parallel and attach to the table row
  private enrichWithTenantData(): void {
    if (!this.selectedTenantId) return;
    const tenantId = this.selectedTenantId;

    this.adminPlugins.forEach((plugin, i) => {
      this.pluginService.getTenantPlugin(plugin.id, tenantId).subscribe({
        next: (tp) => {
          this.adminPlugins[i] = { ...plugin, tenantPlugin: tp };
        },
        error: () => {
          this.adminPlugins[i] = { ...plugin, tenantPlugin: null };
        }
      });
    });
  }

  onSearch(): void { this.adminPage = 1; this.load(); }

  onAdminPage(e: PageEvent): void {
    this.adminPage = e.pageIndex + 1;
    this.adminPageSize = e.pageSize;
    this.load();
  }

  openMasterDialog(plugin: any): void {
    this.dialog.open(PluginEditDialogComponent, {
      width: '520px',
      data: { mode: 'master', plugin }
    }).afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openAdminCredentialsDialog(plugin: any): void {
    if (!this.selectedTenantId) return;

    const fetchAndOpen = (tenantPlugin: any) => {
      this.dialog.open(PluginEditDialogComponent, {
        width: '520px',
        data: { mode: 'adminCredentials', plugin: tenantPlugin, tenantId: this.selectedTenantId }
      }).afterClosed().subscribe(saved => { if (saved) this.enrichWithTenantData(); });
    };

    // Use already-fetched data if available
    if (plugin.tenantPlugin !== undefined) {
      fetchAndOpen(plugin.tenantPlugin ?? { ...plugin, integration_values: null, tenant_plugin_id: null });
      return;
    }

    this.pluginService.getTenantPlugin(plugin.id, this.selectedTenantId).subscribe({
      next: fetchAndOpen,
      error: () => this.snackBar.open('Failed to load tenant plugin data', 'Close', { duration: 3000 })
    });
  }

  openCredentialsDialog(plugin: any): void {
    this.dialog.open(PluginEditDialogComponent, {
      width: '520px',
      data: { mode: 'credentials', plugin }
    }).afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  togglePlugin(plugin: any): void {
    this.pluginService.activatePlugin(plugin.plugin_master_id).subscribe({
      next: (res) => { plugin.is_active = res.is_active; },
      error: () => this.snackBar.open('Failed to toggle plugin', 'Close', { duration: 3000 })
    });
  }
}
