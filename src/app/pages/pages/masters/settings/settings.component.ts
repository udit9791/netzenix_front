import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { environment } from 'src/environments/environment';

interface SettingItem {
  setting_key: string;
  setting_val: any;
  description: string;
  tenant_id?: number;
  type?: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class SettingsComponent implements OnInit {
  loading = false;
  form: FormGroup = this.fb.group({});
  settings: SettingItem[] = [];
  saving = false;
  environment = environment;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/settings`).subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        this.settings = list.map((item: any) => ({
          setting_key: String(item.setting_key || ''),
          setting_val: item.setting_val ?? '',
          description: String(item.description || item.setting_key || ''),
          tenant_id: item.tenant_id,
          type: item.type || 'text'
        }));
        const group: { [key: string]: any } = {};
        this.settings.forEach((s) => {
          const key = s.setting_key;
          if (!key) {
            return;
          }
          const type = this.normalizeType(s.type);
          if (type === 'checkbox') {
            const val = s.setting_val;
            group[key] =
              val === true || val === '1' || val === 1 || val === 'true';
          } else {
            group[key] = s.setting_val ?? '';
          }
        });
        this.form = this.fb.group(group);
        this.loading = false;
      },
      error: () => {
        this.settings = [];
        this.form = this.fb.group({});
        this.loading = false;
      }
    });
  }

  normalizeType(type?: string | null): string {
    const t = String(type || '').toLowerCase();
    if (t === 'number') {
      return 'number';
    }
    if (t === 'textarea') {
      return 'textarea';
    }
    if (t === 'checkbox') {
      return 'checkbox';
    }
    if (t === 'radio') {
      return 'radio';
    }
    if (t === 'file') {
      return 'file';
    }
    return 'text';
  }

  onFileChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) {
      return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (this.form && this.form.contains(key)) {
        this.form.patchValue({ [key]: result });
      }
    };
    reader.readAsDataURL(file);
  }

  fullImgUrl(path: any): string {
    const base = this.environment.imgUrl || '';
    if (!path) {
      return '';
    }
    const p = String(path);
    if (/^https?:\/\//i.test(p) || /^data:|^blob:/i.test(p)) {
      return p;
    }
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const trimmed = p.startsWith('/') ? p.slice(1) : p;
    return `${b}/${trimmed}`;
  }

  update(): void {
    if (!this.form || !this.settings || !this.settings.length) {
      return;
    }
    const formValue = this.form.value || {};
    const settingsPayload = this.settings
      .map((s) => {
        const key = s.setting_key;
        if (!key) {
          return null;
        }
        return {
          key,
          type: this.normalizeType(s.type),
          value: formValue[key]
        };
      })
      .filter((x) => x != null);
    if (!settingsPayload.length) {
      return;
    }
    this.saving = true;
    const payload = { settings: settingsPayload };
    this.http.put<any>(`${environment.apiUrl}/settings`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Settings updated successfully', 'Close', {
          duration: 3000
        });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to update settings', 'Close', {
          duration: 3000
        });
      }
    });
  }
}
