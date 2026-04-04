import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlanService } from '../../services/plan.service';

@Component({
  selector: 'app-subscription-pending',
  standalone: true,
  templateUrl: './subscription-pending.component.html',
  styleUrls: ['./subscription-pending.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class SubscriptionPendingComponent implements OnInit, OnDestroy {
  isLoading = false;
  plan: any | null = null;
  pricingPlan: any | null = null;
  showPaymentCountdown = false;
  paymentCountdown = 0;
  paymentUrl: string | null = null;
  private countdownIntervalId: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private planService: PlanService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPlan();
  }

  ngOnDestroy(): void {
    this.clearPaymentCountdown();
  }

  loadPlan(): void {
    this.isLoading = true;
    this.planService.getTenantPlanByTenant().subscribe({
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

  get tenantId(): number | null {
    if (!this.plan || this.plan.tenant_id == null) {
      return null;
    }
    const num = Number(this.plan.tenant_id);
    return Number.isFinite(num) ? num : null;
  }

  get planName(): string {
    if (this.pricingPlan) {
      return this.pricingPlan.plan_name || this.pricingPlan.name || '-';
    }
    if (!this.plan) {
      return '-';
    }
    return this.plan.plan_name || this.plan.name || '-';
  }

  get amount(): number | null {
    const raw =
      (this.plan &&
        (this.plan.amount !== undefined && this.plan.amount !== null
          ? this.plan.amount
          : this.plan.price)) ??
      (this.pricingPlan && this.pricingPlan.price);
    if (raw === undefined || raw === null) {
      return null;
    }
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw || '0'));
    return Number.isFinite(num) ? num : null;
  }

  get currency(): string {
    if (this.plan && this.plan.currency) {
      return String(this.plan.currency);
    }
    if (this.pricingPlan && this.pricingPlan.currency) {
      return String(this.pricingPlan.currency);
    }
    return 'INR';
  }

  get billingType(): string {
    if (this.pricingPlan && this.pricingPlan.billing_cycle) {
      return String(this.pricingPlan.billing_cycle);
    }
    if (this.plan && this.plan.billing_type) {
      return String(this.plan.billing_type);
    }
    return '-';
  }

  get customDays(): number | null {
    if (
      !this.plan ||
      this.plan.custom_days === undefined ||
      this.plan.custom_days === null
    ) {
      return null;
    }
    const num = Number(this.plan.custom_days);
    return Number.isFinite(num) ? num : null;
  }

  get customerEmail(): string {
    if (!this.plan || !this.plan.customer_email) {
      return '-';
    }
    return String(this.plan.customer_email);
  }

  get contactEmail(): string {
    if (!this.plan) {
      return '-';
    }
    return (
      this.plan.contact_email ||
      (this.plan.tenant && this.plan.tenant.contact_email) ||
      this.customerEmail
    );
  }

  get contactPhone(): string {
    if (!this.plan) {
      return '-';
    }
    return (
      this.plan.contact_phone ||
      (this.plan.tenant && this.plan.tenant.contact_phone) ||
      '-'
    );
  }

  get customerAddress(): string {
    if (!this.plan) {
      return '-';
    }
    const parts: string[] = [];
    if (this.plan.customer_address_street) {
      parts.push(String(this.plan.customer_address_street));
    }
    if (this.plan.customer_address_city) {
      parts.push(String(this.plan.customer_address_city));
    }
    if (this.plan.customer_address_state) {
      parts.push(String(this.plan.customer_address_state));
    }
    if (this.plan.customer_address_postal_code) {
      parts.push(String(this.plan.customer_address_postal_code));
    }
    if (this.plan.customer_address_country) {
      parts.push(String(this.plan.customer_address_country));
    }
    return parts.length ? parts.join(', ') : '-';
  }

  get paymentAmount(): number | null {
    return this.amount;
  }

  get paymentMinutes(): string {
    const minutes = Math.floor(this.paymentCountdown / 60);
    return minutes.toString().padStart(2, '0');
  }

  get paymentSeconds(): string {
    const seconds = this.paymentCountdown % 60;
    return seconds.toString().padStart(2, '0');
  }

  goToTenantPlans(): void {
    this.router.navigate(['/masters/tenant-plans']);
  }

  goToWallet(): void {
    this.router.navigate(['/wallet']);
  }

  payNow(): void {
    const amount = this.paymentAmount;
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const payload: any = {
      amount,
      tenant_id: this.tenantId,
      plan_name: this.planName,
      tenant_domain: this.tenantDomain,
      tenant_name: this.tenantName,
      contact_email: this.contactEmail,
      contact_phone: this.contactPhone
    };
    if (
      this.plan &&
      this.plan.plan_id !== undefined &&
      this.plan.plan_id !== null
    ) {
      payload.plan_id = Number(this.plan.plan_id);
    }
    this.isLoading = true;
    this.planService.createSubscriptionPayment(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const paymentUrl =
          (res && res.payment_url) ||
          (res && res.data && res.data.payment_url) ||
          null;
        if (paymentUrl) {
          this.paymentUrl = String(paymentUrl);
          this.showPaymentCountdown = true;
          this.paymentCountdown = 300;
          this.startPaymentCountdown();
          window.open(String(paymentUrl), '_blank');
        } else {
          this.snackBar.open('Payment URL not available', 'Close', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Failed to send payment request', 'Close', {
          duration: 3000
        });
      }
    });
  }

  cancelPaymentRequest(): void {
    this.clearPaymentCountdown();
    this.showPaymentCountdown = false;
    this.paymentUrl = null;
    this.snackBar.open('Payment cancelled', 'Close', {
      duration: 3000
    });
  }

  private startPaymentCountdown(): void {
    this.clearPaymentCountdown();
    this.countdownIntervalId = setInterval(() => {
      if (this.paymentCountdown > 0) {
        this.paymentCountdown -= 1;
      } else {
        this.clearPaymentCountdown();
        this.showPaymentCountdown = false;
        this.paymentUrl = null;
        this.snackBar.open('Payment session expired', 'Close', {
          duration: 3000
        });
      }
    }, 1000);
  }

  private clearPaymentCountdown(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }
}
