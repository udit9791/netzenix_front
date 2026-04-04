import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PlanService } from '../../../../../services/plan.service';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';

@Component({
  selector: 'app-tenant-plan-detail',
  standalone: true,
  templateUrl: './tenant-plan-detail.component.html',
  styleUrls: ['./tenant-plan-detail.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ]
})
export class TenantPlanDetailComponent implements OnInit {
  isLoading = false;
  plan: any | null = null;
  pricingPlan: any | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planService: PlanService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id || Number.isNaN(id)) {
      this.snackBar.open('Invalid tenant plan id', 'Close', {
        duration: 3000
      });
      this.router.navigate(['/masters/tenant-plans']);
      return;
    }
    this.loadPlan(id);
  }

  loadPlan(id: number): void {
    this.isLoading = true;
    this.planService.getTenantPlan(id).subscribe({
      next: (res: any) => {
        this.plan = res && res.plan ? res.plan : null;
        this.pricingPlan = res && res.pricing_plan ? res.pricing_plan : null;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Failed to load tenant plan detail', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/masters/tenant-plans']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/masters/tenant-plans']);
  }

  get tenantName(): string {
    if (!this.plan) {
      return '-';
    }
    return (
      this.plan.tenant_name ||
      (this.plan.tenant && this.plan.tenant.name) ||
      '-'
    );
  }

  get tenantDomain(): string {
    if (!this.plan) {
      return '-';
    }
    return (
      this.plan.tenant_domain ||
      (this.plan.tenant && this.plan.tenant.domain) ||
      '-'
    );
  }

  get subscriptionId(): number | null {
    if (!this.plan || this.plan.id === undefined || this.plan.id === null) {
      return null;
    }
    const num = Number(this.plan.id);
    return Number.isFinite(num) ? num : null;
  }

  get tenantId(): number | null {
    if (
      !this.plan ||
      this.plan.tenant_id === undefined ||
      this.plan.tenant_id === null
    ) {
      return null;
    }
    const num = Number(this.plan.tenant_id);
    return Number.isFinite(num) ? num : null;
  }

  get userId(): number | null {
    if (
      !this.plan ||
      this.plan.user_id === undefined ||
      this.plan.user_id === null
    ) {
      return null;
    }
    const num = Number(this.plan.user_id);
    return Number.isFinite(num) ? num : null;
  }

  get planId(): number | null {
    if (
      !this.plan ||
      this.plan.plan_id === undefined ||
      this.plan.plan_id === null
    ) {
      return null;
    }
    const num = Number(this.plan.plan_id);
    return Number.isFinite(num) ? num : null;
  }

  get amountValue(): number | null {
    if (
      !this.plan ||
      this.plan.amount === undefined ||
      this.plan.amount === null
    ) {
      return null;
    }
    const raw = this.plan.amount;
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw || '0'));
    return Number.isFinite(num) ? num : null;
  }

  get subscriptionCreatedAt(): string | null {
    if (!this.plan) {
      return null;
    }
    return this.plan.created_at || null;
  }

  get subscriptionUpdatedAt(): string | null {
    if (!this.plan) {
      return null;
    }
    return this.plan.updated_at || null;
  }

  get isActive(): boolean | null {
    if (
      !this.plan ||
      this.plan.is_active === undefined ||
      this.plan.is_active === null
    ) {
      return null;
    }
    return this.plan.is_active === 1 || this.plan.is_active === true;
  }

  get pricingPlanName(): string {
    if (!this.pricingPlan) {
      return '-';
    }
    return this.pricingPlan.plan_name || '-';
  }

  get pricingPlanPrice(): number | null {
    if (
      !this.pricingPlan ||
      this.pricingPlan.price === undefined ||
      this.pricingPlan.price === null
    ) {
      return null;
    }
    const raw = this.pricingPlan.price;
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw || '0'));
    return Number.isFinite(num) ? num : null;
  }

  get billingCycle(): string {
    if (!this.pricingPlan || !this.pricingPlan.billing_cycle) {
      return '-';
    }
    return String(this.pricingPlan.billing_cycle);
  }

  get buttonText(): string {
    if (!this.pricingPlan || !this.pricingPlan.button_text) {
      return '-';
    }
    return String(this.pricingPlan.button_text);
  }

  get pricingStatus(): string {
    if (
      !this.pricingPlan ||
      this.pricingPlan.status === undefined ||
      this.pricingPlan.status === null
    ) {
      return '-';
    }
    const active =
      this.pricingPlan.status === 1 || this.pricingPlan.status === true;
    return active ? 'Active' : 'Inactive';
  }

  get isRecommended(): string {
    if (
      !this.pricingPlan ||
      this.pricingPlan.is_recommended === undefined ||
      this.pricingPlan.is_recommended === null
    ) {
      return '-';
    }
    const val =
      this.pricingPlan.is_recommended === 1 ||
      this.pricingPlan.is_recommended === true;
    return val ? 'Yes' : 'No';
  }

  get sortOrder(): number | null {
    if (
      !this.pricingPlan ||
      this.pricingPlan.sort_order === undefined ||
      this.pricingPlan.sort_order === null
    ) {
      return null;
    }
    const num = Number(this.pricingPlan.sort_order);
    return Number.isFinite(num) ? num : null;
  }

  get pricingCreatedAt(): string | null {
    if (!this.pricingPlan) {
      return null;
    }
    return this.pricingPlan.created_at || null;
  }

  get pricingUpdatedAt(): string | null {
    if (!this.pricingPlan) {
      return null;
    }
    return this.pricingPlan.updated_at || null;
  }

  get paymentAmount(): number | null {
    if (this.amountValue !== null) {
      return this.amountValue;
    }
    if (this.pricingPlanPrice !== null) {
      return this.pricingPlanPrice;
    }
    return null;
  }

  createPaymentLink(): void {
    const amount = this.paymentAmount;
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      this.snackBar.open('Invalid plan price for payment link', 'Close', {
        duration: 3000
      });
      return;
    }
    const paymentData = {
      amount,
      timestamp: Date.now()
    };
    sessionStorage.setItem('paymentAmount', JSON.stringify(paymentData));
    this.router.navigate(['/payment']);
  }
}
