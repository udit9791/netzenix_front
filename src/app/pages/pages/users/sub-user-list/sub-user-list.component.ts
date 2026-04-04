import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  ReactiveFormsModule,
  Validators,
  FormGroup,
  FormBuilder
} from '@angular/forms';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from 'src/app/core/services/user.service';

interface SubUser {
  id: number;
  email: string;
}

interface PermissionItem {
  id: number;
  name: string;
}

interface GroupedPermission {
  groupKey: string;
  groupLabel: string;
  modules: Array<{
    moduleKey: string;
    moduleLabel: string;
    actions: Array<{ id: number; action: string; name: string; label: string }>;
  }>;
}

@Component({
  selector: 'app-sub-user-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './sub-user-list.component.html',
  styleUrls: ['./sub-user-list.component.scss']
})
export class SubUserListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'email', 'actions'];
  subUsers: SubUser[] = [];
  loading = false;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSubUsers();
  }

  loadSubUsers(): void {
    this.loading = true;
    this.userService.getSubUsers(1, 50).subscribe({
      next: (res) => {
        const raw = res && res.data ? res.data : res;
        const data = Array.isArray(raw) ? raw : [];
        this.subUsers = data.map((u: any) => ({
          id: Number(u.id),
          email: String(u.email || '')
        }));
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load sub users', 'OK', {
          duration: 3000
        });
        this.loading = false;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubUserDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'saved') {
        this.loadSubUsers();
      }
    });
  }

  openEditDialog(user: SubUser): void {
    const dialogRef = this.dialog.open(SubUserDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      data: { mode: 'edit', user }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'saved') {
        this.loadSubUsers();
      }
    });
  }
}

@Component({
  selector: 'app-sub-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? 'Add Sub User' : 'Edit Sub User' }}
    </h2>
    <div
      mat-dialog-content
      [formGroup]="form"
      class="flex flex-col gap-4 mt-2"
      style="min-width: 600px; max-height: 80vh; overflow-y: auto">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" type="email" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Password</mat-label>
        <input matInput formControlName="password" type="password" />
      </mat-form-field>

      <div class="mt-2">
        <div class="mb-2 text-sm font-medium">Permissions</div>
        <div class="grid grid-cols-1 gap-2">
          <div
            *ngFor="let group of groupedPermissions"
            class="border rounded p-2 flex flex-col gap-1">
            <div class="font-medium text-sm">
              {{ group.groupLabel }}
            </div>
            <div class="flex flex-col gap-1">
              <div
                *ngFor="let module of group.modules"
                class="flex flex-col gap-1">
                <div class="text-xs font-medium text-indigo-600">
                  {{ module.moduleLabel }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <mat-checkbox
                    *ngFor="let act of module.actions"
                    [checked]="isPermissionSelected(act.id)"
                    (change)="togglePermission(act.id, $event.checked)">
                    {{ act.label }}
                  </mat-checkbox>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div mat-dialog-actions class="flex justify-end gap-2 mt-4">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        (click)="save()"
        [disabled]="form.invalid">
        Save
      </button>
    </div>
  `
})
export class SubUserDialogComponent implements OnInit {
  form: FormGroup;
  selectedPermissionIds = new Set<number>();
  groupedPermissions: GroupedPermission[] = [];
  allPermissions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA)
    public data: { mode: 'create' | 'edit'; user?: SubUser }
  ) {
    this.form = this.fb.group({
      email: [data.user?.email || '', [Validators.required, Validators.email]],
      password: [
        '',
        data.mode === 'create'
          ? [Validators.required, Validators.minLength(6)]
          : []
      ]
    });
  }

  ngOnInit(): void {
    this.loadAllPermissions();
    if (this.data.mode === 'edit' && this.data.user) {
      const userId = this.data.user.id;

      this.userService.getSubUser(userId).subscribe({
        next: (res) => {
          const user = res && res.user ? res.user : res;

          this.form.patchValue({
            email: user?.email || this.form.value.email
          });

          const directPerms = Array.isArray(user?.permissions)
            ? user.permissions
            : [];

          directPerms.forEach((p: any) => {
            const id = p && p.id ? Number(p.id) : null;
            if (id) {
              this.selectedPermissionIds.add(id);
            }
          });
        },
        error: () => {}
      });
    }
  }

  loadAllPermissions(): void {
    const parentId = this.getCurrentUserId();
    if (!parentId) {
      this.groupedPermissions = [];
      return;
    }
    this.userService.getUserPermissions(parentId).subscribe({
      next: (res) => {
        const perms = Array.isArray(res?.permissions) ? res.permissions : [];
        this.allPermissions = perms;
        this.buildGroupedPermissions(perms);
      },
      error: () => {
        this.groupedPermissions = [];
        this.allPermissions = [];
      }
    });
  }

  loadUserPermissions(userId: number): void {
    this.userService.getUserPermissions(userId).subscribe({
      next: (res) => {
        const perms = Array.isArray(res?.permissions) ? res.permissions : [];
        perms.forEach((p: any) => {
          const id = p && p.id ? Number(p.id) : null;
          if (id) {
            this.selectedPermissionIds.add(id);
          }
        });
      },
      error: () => {}
    });
  }

  togglePermission(id: number, checked: boolean): void {
    if (checked) {
      this.selectedPermissionIds.add(id);
    } else {
      this.selectedPermissionIds.delete(id);
    }
  }

  isPermissionSelected(id: number): boolean {
    return this.selectedPermissionIds.has(id);
  }

  private getCurrentUserId(): number | null {
    try {
      const raw =
        localStorage.getItem('user') || localStorage.getItem('userData');
      if (!raw) {
        return null;
      }
      const u = JSON.parse(raw as string);
      const id = Number(u?.id ?? u?.user_id ?? 0);
      return id || null;
    } catch {
      return null;
    }
  }

  private buildGroupedPermissions(allPermissions: any[]): void {
    const all: any[] = Array.isArray(allPermissions) ? allPermissions : [];
    const groupMap: Map<
      string,
      {
        groupKey: string;
        modules: Map<
          string,
          {
            moduleKey: string;
            actions: Array<{
              id: number;
              action: string;
              name: string;
              label: string;
            }>;
          }
        >;
      }
    > = new Map();
    const actionOrder = ['view', 'create', 'edit', 'delete'];

    for (const p of all) {
      const rawName = p && (p.name ?? p);
      const name = typeof rawName === 'string' ? rawName : '';
      const id = p && p.id ? Number(p.id) : 0;
      if (!name || !id) {
        continue;
      }

      const m = name.match(/^(view|create|edit|delete)_(.+)$/);
      const action = m ? m[1] : '';
      const moduleKey = m ? m[2] : '';

      if (!action || !moduleKey) {
        continue;
      }

      let groupKey =
        p &&
        (p.group_name || p.groupName) &&
        String(p.group_name || p.groupName)
          ? String(p.group_name || p.groupName)
          : '';

      if (!groupKey) {
        groupKey = moduleKey;
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
          id,
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
  }

  private prettyModuleName(key: string): string {
    const parts = String(key || '')
      .split('_')
      .filter((x) => !!x)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return parts.join(' ');
  }

  private getSelectedPermissionNames(): string[] {
    const ids = Array.from(this.selectedPermissionIds);
    if (!ids.length || !Array.isArray(this.allPermissions)) {
      return [];
    }
    const names: string[] = [];
    ids.forEach((id: number) => {
      const perm = this.allPermissions.find(
        (p: any) => p && Number(p.id) === id
      );
      if (perm && typeof perm.name === 'string' && perm.name) {
        names.push(perm.name);
      }
    });
    return names;
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }

    const permissionNames = this.getSelectedPermissionNames();

    if (this.data.mode === 'create') {
      const emailValue = String(this.form.value.email || '');
      const inferredName =
        emailValue && emailValue.includes('@')
          ? emailValue.split('@')[0]
          : emailValue;

      const payload: any = {
        name: inferredName,
        email: this.form.value.email,
        password: this.form.value.password,
        permissions: permissionNames
      };

      this.userService.createSubUser(payload).subscribe({
        next: () => {
          this.snackBar.open('Sub user created', 'OK', {
            duration: 3000
          });
          this.dialog.closeAll();
        },
        error: () => {
          this.snackBar.open('Failed to create sub user', 'OK', {
            duration: 3000
          });
        }
      });
    } else if (this.data.user) {
      const userId = this.data.user.id;
      const payload: any = {
        email: this.form.value.email,
        permissions: permissionNames
      };
      if (this.form.value.password) {
        payload.password = this.form.value.password;
      }
      this.userService.updateSubUser(userId, payload).subscribe({
        next: () => {
          this.snackBar.open('Sub user updated', 'OK', {
            duration: 3000
          });
          this.dialog.closeAll();
        },
        error: () => {
          this.snackBar.open('Failed to update sub user', 'OK', {
            duration: 3000
          });
        }
      });
    }
  }
}
