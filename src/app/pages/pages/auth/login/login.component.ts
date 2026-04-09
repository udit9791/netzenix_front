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
    password: ['', Validators.required],
    otp: ['']
  });

  inputType = 'password';
  visible = false;
  logoUrl: string = 'assets/img/logo/logo.svg';
  otpStep = false;
  otpCountdown = 0;
  private otpTimerId: any = null;

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
    const loginId = String(this.form.get('login_id')?.value || '').trim();
    const password = String(this.form.get('password')?.value || '');

    if (!this.otpStep) {
      if (!loginId || !password) {
        this.snackbar.open('Please enter User ID and Password.', 'OK', {
          duration: 3000
        });
        return;
      }

      this.authService
        .requestLoginOtp({ login_id: loginId, password })
        .subscribe({
          next: () => {
            this.otpStep = true;
            this.startOtpTimer(120);
            this.snackbar.open(
              'OTP sent to your registered email. Please enter it below.',
              'OK',
              {
                duration: 3000
              }
            );
            this.cd.markForCheck();
          },
          error: (err: any) => {
            this.snackbar.open(
              err.error?.message || 'Failed to send OTP',
              'OK',
              {
                duration: 3000
              }
            );
          }
        });
      return;
    }

    const otpRaw = this.form.get('otp')?.value;
    const otp =
      typeof otpRaw === 'string' ? otpRaw.trim() : String(otpRaw || '').trim();

    if (!otp || otp.length !== 6) {
      this.snackbar.open(
        'Please enter the 6 digit OTP sent to your email.',
        'OK',
        {
          duration: 3000
        }
      );
      return;
    }

    this.authService.login({ login_id: loginId, password, otp }).subscribe({
      next: (res) => {
        this.clearOtpTimer();
        this.snackbar.open('Login successful!', 'OK', { duration: 3000 });

        if (res.token) {
          localStorage.setItem('token', res.token);
        }

        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
        }

        if (res.roles) {
          localStorage.setItem('roles', JSON.stringify(res.roles));
        }

        if (res.permissions) {
          localStorage.setItem('permissions', JSON.stringify(res.permissions));
        }
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

        localStorage.setItem('is_master', isMaster);

        this.roleConfigService.applyRoleConfigFromUser(
          res.user ?? { roles: res.roles, role_names: res.role_names }
        );

        this.router.navigate(['/']).then(() => {
          window.location.reload();
        });
      },
      error: (err: any) => {
        this.snackbar.open(err.error?.message || 'Login failed', 'OK', {
          duration: 3000
        });
      }
    });
  }

  get otpCountdownDisplay(): string {
    const value = this.otpCountdown;
    if (value <= 0) {
      return '00:00';
    }
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return mm + ':' + ss;
  }

  resendOtp(): void {
    const loginId = String(this.form.get('login_id')?.value || '').trim();
    const password = String(this.form.get('password')?.value || '');

    if (!loginId || !password) {
      this.snackbar.open('Please enter User ID and Password to resend OTP.', 'OK', {
        duration: 3000
      });
      return;
    }

    this.authService
      .requestLoginOtp({ login_id: loginId, password })
      .subscribe({
        next: () => {
          this.startOtpTimer(120);
          this.form.get('otp')?.setValue('');
          this.snackbar.open('New OTP sent to your registered email.', 'OK', {
            duration: 3000
          });
          this.cd.markForCheck();
        },
        error: (err: any) => {
          this.snackbar.open(
            err.error?.message || 'Failed to resend OTP',
            'OK',
            {
              duration: 3000
            }
          );
        }
      });
  }

  private startOtpTimer(seconds: number): void {
    this.clearOtpTimer();
    this.otpCountdown = seconds;
    this.otpTimerId = setInterval(() => {
      if (this.otpCountdown > 0) {
        this.otpCountdown -= 1;
        this.cd.markForCheck();
      } else {
        this.clearOtpTimer();
      }
    }, 1000);
  }

  private clearOtpTimer(): void {
    if (this.otpTimerId) {
      clearInterval(this.otpTimerId);
      this.otpTimerId = null;
    }
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
