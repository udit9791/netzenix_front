import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TenantService } from '../../../../services/tenant.service';

@Component({
  selector: 'vex-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    NgIf,
    MatButtonModule
  ]
})
export class ForgotPasswordComponent implements OnInit {
  form = this.fb.group({
    email: [null, Validators.required]
  });
  logoUrl: string = 'assets/img/logo/logo.svg';

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private tenantService: TenantService
  ) {}

  ngOnInit() {
    this.tenantService.getAppInfo().subscribe((info) => {
      if (info && info.logoUrl) {
        this.logoUrl = info.logoUrl;
      }
    });
  }

  send() {
    this.router.navigate(['/']);
  }
}
