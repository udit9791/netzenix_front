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
    email: ['', Validators.required],
    password: ['', Validators.required]
  });

  inputType = 'password';
  visible = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private roleConfigService: RoleConfigService,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // 🔹 Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/']); // Redirect to dashboard/home
    }
  }

  send() {
    if (this.form.invalid) {
      this.snackbar.open('Please fill in all required fields.', 'OK', {
        duration: 3000
      });
      return;
    }

    const { email, password } = this.form.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
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
          localStorage.setItem('permissions', JSON.stringify(res.permissions));
        }
        // Save permissions & roles for navigation / guards
        const perms = res.permissions || [];
        const roles = res.role_names || res.user?.role_names || [];
        localStorage.setItem('permissions', JSON.stringify(perms));
        localStorage.setItem('roles', JSON.stringify(roles));
        const im = res.is_master;
        const isMaster = im === true || im === 1 || im === '1' ? '1' : '0';
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
