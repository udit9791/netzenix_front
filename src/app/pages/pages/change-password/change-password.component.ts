import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'vex-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ]
})
export class ChangePasswordComponent implements OnInit {
  changePasswordForm!: FormGroup;
  hideCurrent = true;
  hideNew = true;
  hideConfirm = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.changePasswordForm = this.fb.group(
      {
        current_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(6)]],
        confirm_password: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  /** 🔹 Password Match Validator */
  passwordMatchValidator(form: FormGroup) {
    return form.get('new_password')?.value ===
      form.get('confirm_password')?.value
      ? null
      : { mismatch: true };
  }

  /** 🔹 Submit form */
  onSubmit() {
    if (this.changePasswordForm.valid) {
      this.authService.changePassword(this.changePasswordForm.value).subscribe({
        next: () => {
          this.snackbar.open('Password updated successfully!', 'OK', {
            duration: 3000
          });
          this.resetForm();
        },
        error: (err) => {
          this.snackbar.open(
            err.error?.message || 'Failed to update password',
            'OK',
            { duration: 3000 }
          );
        }
      });
    }
  }

  /** 🔹 Reset form */
  resetForm() {
    this.changePasswordForm.reset();
  }
}
