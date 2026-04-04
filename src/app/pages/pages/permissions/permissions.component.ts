import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { RoleService } from 'src/app/core/services/role.service';
import { MatDialog } from '@angular/material/dialog';
import { RoleCreateDialogComponent } from '../roles/role-create-dialog/role-create-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
@Component({
  selector: 'vex-permissions',
  standalone: true,
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule
  ]
})
export class PermissionsComponent implements OnInit {
  roles: any[] = [];
  permissions: any[] = [];
  selectedPermissions: Set<string> = new Set();
  roleForm!: FormGroup;
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

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.roleForm = this.fb.group({
      role: [''],
      newRole: ['']
    });

    this.loadRoles();
    this.loadPermissions();
  }

  /** 🔹 Fetch roles */
  loadRoles() {
    this.roleService.getRoles().subscribe((res) => {
      this.roles = res.data || res;
    });
  }

  /** 🔹 Fetch all permissions */
  loadPermissions() {
    this.roleService.getPermissions().subscribe((res) => {
      this.permissions = res.data || res;
      this.buildGroupedPermissions();
    });
  }

  /** 🔹 On role change, fetch its assigned permissions */
  onRoleChange(roleId: number) {
    this.selectedPermissions.clear();
    if (!roleId) return;

    this.roleService.getRolePermissions(roleId).subscribe((res) => {
      // API returns { role: "Super Admin", permissions: [ "view_users", "create_users" ] }
      const assigned: string[] = res.permissions || [];
      assigned.forEach((p) => this.selectedPermissions.add(p));
      console.log('Assigned permissions:', this.selectedPermissions);
    });
  }

  /** 🔹 Build grouped permissions by group_name and module/action */
  private buildGroupedPermissions() {
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

  /** 🔹 Format module name from key (e.g., my_booking → My Booking) */
  prettyModuleName(key: string): string {
    const parts = String(key || '')
      .split('_')
      .filter((x) => !!x)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return parts.join(' ');
  }

  /** 🔹 Format label for non-CRUD permissions */
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

  /** 🔹 Toggle checkbox */
  togglePermission(permission: string, checked: boolean) {
    if (checked) {
      this.selectedPermissions.add(permission);
    } else {
      this.selectedPermissions.delete(permission);
    }
  }

  /** 🔹 Save selected permissions for role */
  savePermissions() {
    const roleId = this.roleForm.value.role;
    const selected = Array.from(this.selectedPermissions);

    if (!roleId) {
      this.snackbar.open('Please select a role first', 'OK', {
        duration: 3000
      });
      return;
    }

    this.roleService.assignPermissions(roleId, selected).subscribe({
      next: (res) => {
        this.snackbar.open('Permissions saved successfully!', 'OK', {
          duration: 3000
        });
        console.log('Permissions saved successfully', res);

        // optional: reset form or reload role permissions
        // this.roleForm.reset();
        // this.onRoleChange(roleId);
      },
      error: (err) => {
        this.snackbar.open(
          err.error?.message || 'Failed to save permissions',
          'OK',
          { duration: 3000 }
        );
        console.error('Error saving permissions:', err);
      }
    });
  }

  /** 🔹 Add new role */
  addNewRole() {
    const dialogRef = this.dialog.open(RoleCreateDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.roles.push({
          id: this.roles.length + 1,
          name: result.name,
          description: result.description
        });
      }
    });
  }
}
