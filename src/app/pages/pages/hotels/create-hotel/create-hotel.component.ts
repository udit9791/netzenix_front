import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { HotelService } from '../../../../services/hotel.service';

@Component({
  selector: 'vex-create-hotel',
  templateUrl: './create-hotel.component.html',
  styleUrls: ['./create-hotel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    RouterModule
  ]
})
export class CreateHotelComponent {
  form: FormGroup;
  submitting = false;
  currentYear = new Date().getFullYear();
  hotelId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      star_rating: [
        3,
        [Validators.required, Validators.min(1), Validators.max(5)]
      ],
      built_year: [
        2000,
        [
          Validators.required,
          Validators.min(1800),
          Validators.max(new Date().getFullYear())
        ]
      ]
    });
    this.route.queryParams.subscribe((params) => {
      const idParam =
        params['id'] ?? params['hotelId'] ?? params['hotel_id'] ?? null;
      const idNum = idParam ? Number(idParam) : null;
      this.hotelId = idNum && !isNaN(idNum) ? idNum : null;
    });
  }

  submit() {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    const payload = {
      name: String(this.form.value.name || '').trim(),
      star_rating: Number(this.form.value.star_rating || 0),
      built_year: Number(this.form.value.built_year || 0),
      hotel_id: this.hotelId
    };
    console.log(payload);
    this.hotelService.createHotelBasic(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/sale/hotels']);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
