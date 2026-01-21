import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'vex-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true, // 👈 make it standalone
  imports: [
    CommonModule,
    ReactiveFormsModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['']
    });

    // Example: Load existing profile (later via API)
    this.profileForm.patchValue({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210'
    });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      console.log('Form Submitted:', this.profileForm.value);
      // 👉 Call your ProfileService to send data to Laravel API
    }
  }

  resetForm() {
    this.profileForm.reset();
  }
}
