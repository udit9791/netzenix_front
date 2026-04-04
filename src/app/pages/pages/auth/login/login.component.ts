import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../../../services/auth.service';
import { RoleConfigService } from 'src/app/core/services/role-config.service';
import { TenantService } from '../../../../services/tenant.service';

@Component({
  selector: 'vex-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatCheckboxModule,
    RouterLink,
    MatSnackBarModule
  ]
})
export class LoginComponent {
  form = this.fb.group({
    login_id: ['', Validators.required],
    password: ['', Validators.required]
  });

  inputType = 'password';
  visible = false;
  logoUrl: string = 'assets/img/logo/logo.svg';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private roleConfigService: RoleConfigService,
    private snackbar: MatSnackBar,
    private authService: AuthService,
    private tenantService: TenantService
  ) {}

  ngOnInit(): void {
    // 🔹 Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/']);
    }
    this.tenantService.getAppInfo().subscribe((info) => {
      if (info && info.logoUrl) {
        this.logoUrl = info.logoUrl;
        this.cd.markForCheck();
      }
    });
  }

  send() {
    if (this.form.invalid) {
      this.snackbar.open('Please fill in all required fields.', 'OK', {
        duration: 3000
      });
      return;
    }

    const { login_id, password } = this.form.value;

    this.authService
      .login({ login_id: login_id!, password: password! })
      .subscribe({
        next: (res) => {
          this.snackbar.open('Login successful!', 'OK', { duration: 3000 });

          // 🔹 Save token
          if (res.token) {
            localStorage.setItem('token', res.token);
          }

          // 🔹 Save user info
          if (res.user) {
            localStorage.setItem('user', JSON.stringify(res.user));
          }

          // 🔹 Save roles
          if (res.roles) {
            localStorage.setItem('roles', JSON.stringify(res.roles));
          }

          // 🔹 Save permissions
          if (res.permissions) {
            localStorage.setItem(
              'permissions',
              JSON.stringify(res.permissions)
            );
          }
          // Save permissions & roles for navigation / guards
          const perms = res.permissions || [];
          const roleNames = res.role_names || res.user?.role_names || [];
          localStorage.setItem('permissions', JSON.stringify(perms));
          localStorage.setItem('roles', JSON.stringify(roleNames));

          const isMaster = res.roles?.some((r: any) => {
            const id = Number(r?.id ?? r?.role_id ?? r);
            return id === 1 || id === 2;
          })
            ? '1'
            : '0';

          //  alert(isMaster);
          //    alert(res.roles[0].id);
          localStorage.setItem('is_master', isMaster);

          // Apply role-based theme
          this.roleConfigService.applyRoleConfigFromUser(
            res.user ?? { roles: res.roles, role_names: res.role_names }
          );

          this.router.navigate(['/']).then(() => {
            window.location.reload();
          });
        },
        error: (err) => {
          this.snackbar.open(err.error?.message || 'Login failed', 'OK', {
            duration: 3000
          });
        }
      });
  }

  toggleVisibility() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visible = true;
      this.cd.markForCheck();
    }
  }
}
