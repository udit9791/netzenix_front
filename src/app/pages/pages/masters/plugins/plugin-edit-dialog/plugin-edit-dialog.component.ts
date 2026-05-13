import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgFor, NgIf } from '@angular/common';
import { PluginService } from '../../../../../services/plugin.service';

export interface PluginDialogData {
  mode: 'master' | 'credentials' | 'adminCredentials';
  plugin: any;
  tenantId?: number;
}

@Component({
  selector: 'app-plugin-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatSnackBarModule,
    MatTooltipModule, NgFor, NgIf
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'master'
          ? (data.plugin?.id ? 'Edit Plugin' : 'New Plugin')
          : data.mode === 'adminCredentials'
            ? 'Admin Configure: ' + data.plugin?.name
            : 'Configure: ' + data.plugin?.name }}
    </h2>

    <mat-dialog-content class="min-w-[520px] pt-2 space-y-3">
      <form [formGroup]="form">

        <!-- ── Master mode: visual field builder ── -->
        <ng-container *ngIf="data.mode === 'master'">
          <mat-form-field class="w-full">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field class="w-full">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>

          <!-- Fields: read-only display (schema managed by seeder) -->
          <div *ngIf="masterFields.length" class="mt-3">
            <p class="text-sm font-medium text-gray-600 mb-2">Integration Fields</p>
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-100 text-xs uppercase text-gray-500">
                  <tr>
                    <th class="px-3 py-2 text-left">Key</th>
                    <th class="px-3 py-2 text-left">Label</th>
                    <th class="px-3 py-2 text-left">Type</th>
                    <th class="px-3 py-2 text-center">Required</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let f of masterFields; let odd = odd"
                      [class.bg-gray-50]="odd">
                    <td class="px-3 py-2 font-mono text-xs text-blue-700">{{ f.key }}</td>
                    <td class="px-3 py-2">{{ f.label }}</td>
                    <td class="px-3 py-2 text-gray-500">{{ f.type }}</td>
                    <td class="px-3 py-2 text-center">
                      <mat-icon class="!text-base" [class.text-green-500]="f.required" [class.text-gray-300]="!f.required">
                        {{ f.required ? 'check_circle' : 'remove' }}
                      </mat-icon>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex items-center gap-4 mt-3">
            <mat-slide-toggle formControlName="is_master">Master (all tenants)</mat-slide-toggle>
            <mat-slide-toggle formControlName="is_active">Active</mat-slide-toggle>
          </div>
        </ng-container>

        <!-- ── Credentials / Admin-credentials mode ── -->
        <ng-container *ngIf="data.mode !== 'master'">
          <p *ngIf="locked" class="text-sm text-amber-600 flex items-center gap-1 mb-2">
            <mat-icon class="text-base">lock</mat-icon> This plugin is locked by admin.
          </p>

          <ng-container *ngFor="let field of credentialFields">
            <mat-form-field class="w-full">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput
                     [type]="field.type === 'password' ? 'password' : 'text'"
                     [formControlName]="field.key"
                     [readonly]="locked" />
            </mat-form-field>
          </ng-container>

          <p *ngIf="!credentialFields.length" class="text-sm text-gray-400">
            No configurable fields for this plugin.
          </p>

          <div *ngIf="data.mode === 'adminCredentials'"
               class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <mat-slide-toggle formControlName="is_locked_by_master" color="warn">
              Lock plugin (prevent tenant from editing)
            </mat-slide-toggle>
          </div>
        </ng-container>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="gap-2">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="saving || locked"
              (click)="save()">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class PluginEditDialogComponent implements OnInit {
  form!: FormGroup;
  masterFields: { key: string; type: string; label: string; required: boolean }[] = [];
  credentialFields: { key: string; type: string; label: string }[] = [];
  locked = false;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<PluginEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PluginDialogData,
    private fb: FormBuilder,
    private pluginService: PluginService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.locked = this.data.mode === 'credentials' && !!this.data.plugin?.is_locked_by_master;

    if (this.data.mode === 'master') {
      const p = this.data.plugin;
      this.masterFields = p?.integration_schema?.fields ?? [];

      this.form = this.fb.group({
        name:        [p?.name ?? ''],
        description: [p?.description ?? ''],
        is_master:   [p?.is_master ?? true],
        is_active:   [p?.is_active ?? true],
      });
    } else {
      this.credentialFields = this.data.plugin?.integration_schema?.fields ?? [];
      const existing = this.data.plugin?.integration_values ?? {};
      const controls: Record<string, any> = {};
      this.credentialFields.forEach(f => {
        controls[f.key] = [{ value: existing[f.key] ?? '', disabled: this.locked }];
      });
      controls['is_locked_by_master'] = [!!this.data.plugin?.is_locked_by_master];
      this.form = this.fb.group(controls);
    }
  }

  save(): void {
    this.saving = true;

    if (this.data.mode === 'master') {
      const v = this.form.value;
      const schema = this.masterFields.length ? { fields: this.masterFields } : null;

      const payload = {
        name:               v.name,
        description:        v.description,
        integration_schema: schema,
        is_master:          v.is_master,
        is_active:          v.is_active
      };

      const req = this.data.plugin?.id
        ? this.pluginService.updatePlugin(this.data.plugin.id, payload)
        : this.pluginService.createPlugin(payload);

      req.subscribe({
        next: () => { this.saving = false; this.dialogRef.close(true); },
        error: () => { this.saving = false; this.snackBar.open('Failed to save plugin', 'Close', { duration: 3000 }); }
      });

    } else if (this.data.mode === 'adminCredentials') {
      const raw = this.form.getRawValue();
      const { is_locked_by_master, ...integrationValues } = raw;
      const tenantPluginId = this.data.plugin.tenant_plugin_id;
      if (!tenantPluginId) {
        this.snackBar.open('No tenant plugin record found', 'Close', { duration: 3000 });
        this.saving = false;
        return;
      }
      this.pluginService.adminUpdatePlugin(tenantPluginId, {
        integration_values: integrationValues,
        is_locked_by_master
      }).subscribe({
        next: () => { this.saving = false; this.dialogRef.close(true); },
        error: () => { this.saving = false; this.snackBar.open('Failed to save credentials', 'Close', { duration: 3000 }); }
      });

    } else {
      const values = this.form.getRawValue();
      this.pluginService.saveCredentials(this.data.plugin.plugin_master_id, values).subscribe({
        next: () => { this.saving = false; this.dialogRef.close(true); },
        error: () => { this.saving = false; this.snackBar.open('Failed to save credentials', 'Close', { duration: 3000 }); }
      });
    }
  }
}
