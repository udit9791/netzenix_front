import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoleService } from 'src/app/core/services/role.service';
import { TenantService } from 'src/app/services/tenant.service';

@Component({
  selector: 'app-tenant-permissions',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <div class="p-6 container" *ngIf="tenantId !== null">
      <div class="card flex-auto">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 class="title m-0">Tenant Permissions (ID: {{ tenantId }})</h2>
            <p class="text-xs text-gray-500 mt-1">
              Note: Tenant will see only these permissions in their Permissions
              tab and can override them tenant-wise.
            </p>
          </div>
          <button mat-stroked-button color="primary" (click)="goBack()">
            Back to Tenants
          </button>
        </div>

        <div class="px-6 py-4 flex flex-col gap-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              *ngFor="let group of groupedPermissions"
              class="border rounded p-3 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <div class="font-medium">{{ group.groupLabel }}</div>
                <mat-checkbox
                  [checked]="isGroupFullySelected(group)"
                  [indeterminate]="isGroupPartiallySelected(group)"
                  (change)="toggleGroup(group, $event.checked)">
                </mat-checkbox>
              </div>
              <div class="border-b border-gray-200 my-1"></div>
              <div class="flex flex-col gap-2">
                <div
                  *ngFor="let module of group.modules"
                  class="flex flex-col gap-2">
                  <div class="text-sm font-medium text-indigo-600">
                    {{ module.moduleLabel }}
                  </div>
                  <div class="h-px w-full bg-indigo-200 mb-1"></div>
                  <div class="flex flex-wrap gap-3">
                    <mat-checkbox
                      *ngFor="let act of module.actions"
                      [checked]="selectedPermissions.has(act.name)"
                      (change)="togglePermission(act.name, $event.checked)">
                      {{ act.label }}
                    </mat-checkbox>
                  </div>
                </div>
              </div>
            </div>

            <div
              *ngIf="otherPermissions.length"
              class="border rounded p-3 flex flex-col gap-2">
              <div class="font-medium">Other</div>
              <div class="flex flex-col gap-1">
                <mat-checkbox
                  *ngFor="let perm of otherPermissions"
                  [checked]="selectedPermissions.has(perm.name || perm)"
                  (change)="
                    togglePermission(perm.name || perm, $event.checked)
                  ">
                  {{ formatPermissionLabel(perm.name || perm) }}
                </mat-checkbox>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              mat-flat-button
              color="primary"
              (click)="saveTenantPermissions()">
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TenantPermissionsComponent implements OnInit {
  tenantId: number | null = null;

  permissions: any[] = [];
  groupedPermissions: Array<{
    groupKey: string;
    groupLabel: string;
    modules: Array<{
      moduleKey: string;
      moduleLabel: string;
      actions: Array<{ action: string; name: string; label: string }>;
    }>;
  }> = [];
  otherPermissions: any[] = [];
  selectedPermissions: Set<string> = new Set();
  private permissionIdByName: Map<string, number> = new Map();
  private permissionNameById: Map<number, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private tenantService: TenantService,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      this.snackbar.open('Invalid tenant id', 'OK', {
        duration: 3000
      });
      this.goBack();
      return;
    }
    this.tenantId = id;
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.roleService.getPermissions().subscribe({
      next: (res: any) => {
        this.permissions = res?.data || res || [];
        this.permissionIdByName.clear();
        this.permissionNameById.clear();
        for (const p of this.permissions) {
          const rawId =
            p && (p.id ?? p.permission_id ?? p.permissionId ?? p.permissionID);
          const rawName =
            p && (p.name ?? p.permission_name ?? p.permissionName);
          const id =
            rawId !== undefined && rawId !== null ? Number(rawId) : NaN;
          const name = typeof rawName === 'string' ? rawName : '';
          if (!Number.isNaN(id) && id > 0 && name) {
            this.permissionIdByName.set(name, id);
            this.permissionNameById.set(id, name);
          }
        }
        this.buildGroupedPermissions();
        this.loadTenantPermissions();
      },
      error: () => {
        this.permissions = [];
        this.groupedPermissions = [];
        this.otherPermissions = [];
        this.snackbar.open('Failed to load permissions', 'OK', {
          duration: 3000
        });
      }
    });
  }

  loadTenantPermissions(): void {
    if (!this.tenantId) {
      return;
    }
    this.tenantService.getTenantPermissions(this.tenantId).subscribe({
      next: (res: any) => {
        const fromNames: any[] =
          res?.permissions ||
          res?.data?.permissions ||
          (Array.isArray(res) ? res : []);

        const fromIds: any[] =
          res?.permission_ids || res?.data?.permission_ids || [];

        const namesFromNames: string[] = Array.isArray(fromNames)
          ? fromNames.filter((p) => typeof p === 'string')
          : [];

        const namesFromIds: string[] =
          Array.isArray(fromIds) && this.permissionNameById.size
            ? fromIds
                .map((raw) => {
                  const id =
                    raw && typeof raw === 'object'
                      ? Number(
                          raw.id ??
                            raw.permission_id ??
                            raw.permissionId ??
                            raw.permissionID
                        )
                      : Number(raw);
                  if (!id || Number.isNaN(id)) {
                    return null;
                  }
                  const name = this.permissionNameById.get(id);
                  return name || null;
                })
                .filter((n): n is string => !!n)
            : [];

        const allNames: string[] = [...namesFromNames, ...namesFromIds];
        this.selectedPermissions.clear();
        allNames.forEach((p) => this.selectedPermissions.add(p));
      },
      error: () => {
        this.selectedPermissions.clear();
      }
    });
  }

  private getGroupPermissionNames(group: {
    modules: Array<{
      actions: Array<{ name: string }>;
    }>;
  }): string[] {
    const perms: string[] = [];
    for (const module of group.modules) {
      for (const action of module.actions) {
        if (action && typeof action.name === 'string') {
          perms.push(action.name);
        }
      }
    }
    return perms;
  }

  isGroupFullySelected(group: {
    modules: Array<{
      actions: Array<{ name: string }>;
    }>;
  }): boolean {
    const names = this.getGroupPermissionNames(group);
    if (!names.length) {
      return false;
    }
    return names.every((n) => this.selectedPermissions.has(n));
  }

  isGroupPartiallySelected(group: {
    modules: Array<{
      actions: Array<{ name: string }>;
    }>;
  }): boolean {
    const names = this.getGroupPermissionNames(group);
    if (!names.length) {
      return false;
    }
    const selectedCount = names.filter((n) =>
      this.selectedPermissions.has(n)
    ).length;
    return selectedCount > 0 && selectedCount < names.length;
  }

  toggleGroup(
    group: {
      modules: Array<{
        actions: Array<{ name: string }>;
      }>;
    },
    checked: boolean
  ): void {
    const names = this.getGroupPermissionNames(group);
    if (!names.length) {
      return;
    }
    if (checked) {
      names.forEach((n) => this.selectedPermissions.add(n));
    } else {
      names.forEach((n) => this.selectedPermissions.delete(n));
    }
  }

  private buildGroupedPermissions(): void {
    const all: any[] = Array.isArray(this.permissions) ? this.permissions : [];
    const groupMap: Map<
      string,
      {
        groupKey: string;
        modules: Map<
          string,
          {
            moduleKey: string;
            actions: Array<{ action: string; name: string; label: string }>;
          }
        >;
      }
    > = new Map();
    const others: any[] = [];
    const actionOrder = ['view', 'create', 'edit', 'delete'];

    for (const p of all) {
      const rawName = p && (p.name ?? p);
      const name = typeof rawName === 'string' ? rawName : '';
      if (!name) {
        others.push(p);
        continue;
      }

      const groupKey =
        p &&
        (p.group_name || p.groupName) &&
        String(p.group_name || p.groupName)
          ? String(p.group_name || p.groupName)
          : '';

      const m = name.match(/^(view|create|edit|delete)_(.+)$/);
      const action = m ? m[1] : '';
      const moduleKey = m ? m[2] : '';

      if (!groupKey || !action || !moduleKey) {
        others.push(p);
        continue;
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupKey,
          modules: new Map()
        });
      }
      const group = groupMap.get(groupKey)!;

      if (!group.modules.has(moduleKey)) {
        group.modules.set(moduleKey, {
          moduleKey,
          actions: []
        });
      }
      const module = group.modules.get(moduleKey)!;

      if (!module.actions.some((a) => a.name === name)) {
        module.actions.push({
          action,
          name,
          label: action.charAt(0).toUpperCase() + action.slice(1)
        });
      }
    }

    this.groupedPermissions = Array.from(groupMap.values())
      .map((grp) => ({
        groupKey: grp.groupKey,
        groupLabel: this.prettyModuleName(grp.groupKey),
        modules: Array.from(grp.modules.values())
          .map((m) => ({
            moduleKey: m.moduleKey,
            moduleLabel: this.prettyModuleName(m.moduleKey),
            actions: m.actions.sort(
              (a, b) =>
                actionOrder.indexOf(a.action) - actionOrder.indexOf(b.action)
            )
          }))
          .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel))
      }))
      .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));

    this.otherPermissions = others;
  }

  prettyModuleName(key: string): string {
    const parts = String(key || '')
      .split('_')
      .filter((x) => !!x)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return parts.join(' ');
  }

  formatPermissionLabel(name: string): string {
    const s = String(name || '');
    const m = s.match(/^(view|create|edit|delete)_(.+)$/);
    if (m) {
      const act = m[1];
      const mod = this.prettyModuleName(m[2]);
      return `${act.charAt(0).toUpperCase() + act.slice(1)} ${mod}`;
    }
    return s
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  togglePermission(permission: string, checked: boolean): void {
    if (checked) {
      this.selectedPermissions.add(permission);
    } else {
      this.selectedPermissions.delete(permission);
    }
  }

  saveTenantPermissions(): void {
    if (!this.tenantId) {
      this.snackbar.open('Invalid tenant id', 'OK', {
        duration: 3000
      });
      return;
    }
    const selectedNames = Array.from(this.selectedPermissions);
    const permissionIds = selectedNames
      .map((name) => this.permissionIdByName.get(name))
      .filter(
        (id): id is number => typeof id === 'number' && !Number.isNaN(id)
      );

    this.tenantService
      .assignTenantPermissions(this.tenantId, permissionIds)
      .subscribe({
        next: () => {
          this.snackbar.open('Tenant permissions saved successfully', 'OK', {
            duration: 3000
          });
        },
        error: (err) => {
          this.snackbar.open(
            err?.error?.message || 'Failed to save tenant permissions',
            'OK',
            {
              duration: 3000
            }
          );
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/masters/tenant']);
  }
}
