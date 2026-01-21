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
    moduleKey: string;
    moduleName: string;
    items: Array<{ action: string; name: string }>;
  }> = [];
  otherPermissions: string[] = [];

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

  /** 🔹 Build grouped permissions by module name */
  private buildGroupedPermissions() {
    const list: string[] = (this.permissions || [])
      .map((p: any) => p?.name ?? p)
      .filter((s: any) => typeof s === 'string');
    const actionOrder = ['view', 'create', 'edit', 'delete'];
    const map: Map<
      string,
      { moduleKey: string; items: Array<{ action: string; name: string }> }
    > = new Map();
    const others: string[] = [];

    for (const perm of list) {
      const m = perm.match(/^(view|create|edit|delete)_(.+)$/);
      if (m) {
        const action = m[1];
        const moduleKey = m[2];
        if (!map.has(moduleKey)) {
          map.set(moduleKey, { moduleKey, items: [] });
        }
        const bucket = map.get(moduleKey)!;
        // Avoid duplicates
        if (!bucket.items.some((it) => it.name === perm)) {
          bucket.items.push({ action, name: perm });
        }
      } else {
        // Non-CRUD style permissions
        if (!others.includes(perm)) others.push(perm);
      }
    }

    // Sort items inside each module by action order
    this.groupedPermissions = Array.from(map.values())
      .map((grp) => ({
        moduleKey: grp.moduleKey,
        moduleName: this.prettyModuleName(grp.moduleKey),
        items: grp.items.sort(
          (a, b) =>
            actionOrder.indexOf(a.action) - actionOrder.indexOf(b.action)
        )
      }))
      .sort((a, b) => a.moduleName.localeCompare(b.moduleName));

    // Format others (keep as raw names; template will format label)
    this.otherPermissions = others.sort();
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
