import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { interval, Observable, Subject } from 'rxjs';
import { take, takeUntil, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { PlanService } from '../../services/plan.service';
import { PaymentService } from '../../services/payment.service';

const MAX_POLLS = 45; // 45 × 4 s = 3 minutes

@Component({
  selector: 'app-payment-processing',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatButtonModule, MatIconModule, NgIf, RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <ng-container *ngIf="!timedOut; else timeoutBlock">
        <mat-spinner diameter="56"></mat-spinner>
        <h2 class="text-xl font-semibold text-gray-700">Waiting for payment confirmation…</h2>
        <p class="text-sm text-gray-500">This page checks automatically every few seconds.</p>
        <p class="text-xs text-gray-400">Poll {{ pollCount }}/{{ maxPolls }}</p>
      </ng-container>

      <ng-template #timeoutBlock>
        <mat-icon class="text-5xl text-amber-500" style="font-size:48px">schedule</mat-icon>
        <h2 class="text-xl font-semibold text-gray-700">Payment still pending</h2>
        <p class="text-sm text-gray-500">
          Your payment may take a few more minutes to confirm. You can check your status later.
        </p>
        <a mat-raised-button color="primary" [routerLink]="timeoutRoute">
          {{ timeoutLabel }}
        </a>
      </ng-template>
    </div>
  `
})
export class PaymentProcessingComponent implements OnInit {
  readonly maxPolls = MAX_POLLS;
  pollCount = 0;
  timedOut = false;
  timeoutRoute = '/plan-billing';
  timeoutLabel = 'Go to Plan & Billing';

  private readonly destroyRef = inject(DestroyRef);
  private readonly stop$ = new Subject<void>();

  constructor(
    private planService: PlanService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const subscriptionId = sessionStorage.getItem('subscription_id');
    const walletTxId     = sessionStorage.getItem('wallet_transaction_id');

    if (!subscriptionId && !walletTxId) {
      this.router.navigate(['/']);
      return;
    }

    if (subscriptionId) {
      this.startPolling(
        () => this.planService.getSubscriptionStatus(Number(subscriptionId)),
        (res) => res?.payment_status === 'paid',
        () => {
          sessionStorage.removeItem('subscription_id');
          this.router.navigate(['/plan-billing']);
        }
      );
      this.timeoutRoute = '/plan-billing';
      this.timeoutLabel = 'Go to Plan & Billing';
    } else {
      this.startPolling(
        () => this.paymentService.getWalletTxStatus(Number(walletTxId)),
        (res) => res?.payment_status === 1,
        () => {
          sessionStorage.removeItem('wallet_transaction_id');
          this.router.navigate(['/wallet']);
        }
      );
      this.timeoutRoute = '/wallet';
      this.timeoutLabel = 'Go to Wallet';
    }
  }

  private startPolling(
    fetchFn: () => Observable<any>,
    successFn: (res: any) => boolean,
    onSuccess: () => void
  ): void {
    interval(4000)
      .pipe(
        take(MAX_POLLS),
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.stop$),
        switchMap(fetchFn)
      )
      .subscribe({
        next: (res) => {
          this.pollCount++;
          if (successFn(res)) {
            this.stop$.next();
            onSuccess();
          }
        },
        error: () => { this.pollCount++; },
        complete: () => { this.timedOut = true; }
      });
  }
}
