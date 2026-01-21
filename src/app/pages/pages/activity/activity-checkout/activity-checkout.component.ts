import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormControl
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import {
  ActivityCartItem,
  ActivityCartService
} from 'src/app/core/services/activity-cart.service';

@Component({
  selector: 'vex-activity-checkout',
  standalone: true,
  templateUrl: './activity-checkout.component.html',
  styleUrls: ['./activity-checkout.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatSelectModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class ActivityCheckoutComponent implements OnInit {
  items: ActivityCartItem[] = [];
  subtotal = 0;
  contactForm: FormGroup;
  travelersForm: FormGroup;
  mobileNumberControl = new FormControl('');
  travelerError = '';
  travelerSuccess = '';

  constructor(
    private cartService: ActivityCartService,
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.travelersForm = this.fb.group({
      travelers: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadCart();
    if (!this.items.length) {
      this.router.navigate(['/activities/cart']);
    }
    this.buildTravelersControls();
  }

  backToCart(): void {
    this.router.navigate(['/activities/cart']);
  }

  proceedToPayment(): void {
    if (!this.items.length) {
      this.router.navigate(['/activities/cart']);
      return;
    }
    if (this.contactForm.invalid || this.travelersForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.travelersForm.markAllAsTouched();
      return;
    }
    const payload = {
      contact: this.contactForm.value,
      travelers: this.travelers.value,
      items: this.items,
      totalAmount: this.subtotal
    };
    console.log('Activity booking confirmation payload', payload);
  }

  private loadCart(): void {
    this.items = this.cartService.getItems();
    this.subtotal = this.items.reduce((sum, item) => {
      const v = item.totalPrice ?? 0;
      return sum + (typeof v === 'number' ? v : 0);
    }, 0);
  }

  private buildTravelersControls(): void {
    const totalAdults = this.items.reduce((sum, item) => sum + item.adults, 0);
    const totalChildren = this.items.reduce(
      (sum, item) => sum + item.children,
      0
    );
    const arr = this.travelersArray;
    arr.clear();
    for (let i = 0; i < totalAdults; i++) {
      arr.push(
        this.fb.group({
          type: ['Adult'],
          title: ['Mr'],
          firstName: ['', Validators.required],
          lastName: ['', Validators.required]
        })
      );
    }
    for (let i = 0; i < totalChildren; i++) {
      arr.push(
        this.fb.group({
          type: ['Child'],
          title: ['Master'],
          firstName: ['', Validators.required],
          lastName: ['', Validators.required]
        })
      );
    }
  }

  get travelersArray(): FormArray {
    return this.travelersForm.get('travelers') as FormArray;
  }

  get travelers() {
    return this.travelersArray.value;
  }

  fetchTravelersByMobile(): void {
    const mobileRaw = this.mobileNumberControl.value;
    const mobile = (mobileRaw || '').toString().trim();
    const digitsOnly = mobile.replace(/\D/g, '');
    if (!digitsOnly || digitsOnly.length < 7) {
      this.travelerError = 'Please enter a valid mobile number';
      this.travelerSuccess = '';
      return;
    }
    this.contactForm.patchValue({ phone: mobile });
    this.travelerError = '';
    this.travelerSuccess = '';
    this.http
      .post(`${environment.apiUrl}/orders/fetch-details-by-mobile`, {
        customer_mobile: mobile
      })
      .subscribe({
        next: (response: any) => {
          const data = response?.data;
          const travelers = Array.isArray(data)
            ? data.map((d: any) => {
                const raw = String(d.type || '').toLowerCase();
                const type =
                  raw === 'child'
                    ? 'Child'
                    : raw === 'infant'
                      ? 'Infant'
                      : 'Adult';
                return {
                  type,
                  title: d.title,
                  firstName: d.first_name ?? d.firstName ?? '',
                  lastName: d.last_name ?? d.lastName ?? ''
                };
              })
            : data
              ? [
                  {
                    type: 'Adult',
                    title: data.title,
                    firstName: data.first_name ?? '',
                    lastName: data.last_name ?? ''
                  }
                ]
              : [];
          if (!travelers.length) {
            this.travelerError =
              response?.message || 'No traveler details found';
            this.travelerSuccess = '';
            return;
          }
          const arr = this.travelersArray;
          const totalNeeded = arr.length;
          if (!totalNeeded) {
            this.travelerError = '';
            this.travelerSuccess = 'Traveler details fetched';
            return;
          }
          for (let i = 0; i < totalNeeded; i++) {
            const existingGroup = arr.at(i) as FormGroup;
            const existingType = existingGroup.get('type')?.value;
            const match =
              travelers.find((t: any) => t.type === existingType) ||
              travelers[i] ||
              null;
            if (match) {
              existingGroup.patchValue({
                title: match.title || existingGroup.get('title')?.value,
                firstName: match.firstName || '',
                lastName: match.lastName || ''
              });
            }
          }
          this.travelerError = '';
          this.travelerSuccess = 'Traveler details filled from mobile';
        },
        error: () => {
          this.travelerError = 'Failed to fetch traveler details';
          this.travelerSuccess = '';
        }
      });
  }
}
