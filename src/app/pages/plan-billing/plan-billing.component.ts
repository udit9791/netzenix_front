import { Component, OnInit, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgIf, NgClass, DatePipe, CurrencyPipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlanService } from '../../services/plan.service';

@Component({
  selector: 'app-plan-billing',
  standalone: true,
  imports: [
    MatCardModule, MatButtonModule, MatProgressBarModule,
    MatTableModule, MatPaginatorModule, MatChipsModule,
    MatIconModule, MatProgressSpinnerModule,
    NgIf, NgClass, DatePipe, CurrencyPipe, TitleCasePipe, DecimalPipe, RouterLink
  ],
  template: `
    <div class="p-6 max-w-5xl mx-auto space-y-6">

      <!-- Page header -->
      <h1 class="text-2xl font-bold text-gray-800">Plan & Billing</h1>

      <!-- Current Plan card -->
      <mat-card class="shadow-sm">
        <mat-card-header>
          <mat-card-title class="text-lg font-semibold">Current Plan</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">

          <div *ngIf="loadingPlan" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <ng-container *ngIf="!loadingPlan">
            <div *ngIf="currentPlan; else noPlan">
              <div class="flex items-center gap-3 mb-4">
                <span class="text-2xl font-bold text-gray-800">{{ currentPlan.plan_name }}</span>
                <span class="px-3 py-1 rounded-full text-xs font-semibold text-white"
                      [ngClass]="cycleColor(currentPlan.billing_cycle)">
                  {{ currentPlan.billing_cycle | titlecase }}
                </span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-sm text-gray-600">
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wide">Amount</p>
                  <p class="font-semibold text-gray-800">
                    {{ currentPlan.amount | currency: currentPlan.currency : 'symbol' : '1.2-2' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wide">Start Date</p>
                  <p class="font-semibold text-gray-800">{{ currentPlan.starts_at | date:'mediumDate' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wide">End Date</p>
                  <p class="font-semibold text-gray-800">{{ currentPlan.ends_at | date:'mediumDate' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wide">Days Remaining</p>
                  <p class="font-semibold" [ngClass]="currentPlan.days_remaining <= 7 ? 'text-red-600' : 'text-green-600'">
                    {{ currentPlan.days_remaining }} day{{ currentPlan.days_remaining === 1 ? '' : 's' }}
                  </p>
                </div>
              </div>

              <mat-progress-bar
                mode="determinate"
                [value]="planProgress"
                [color]="currentPlan.days_remaining <= 7 ? 'warn' : 'primary'"
                class="rounded">
              </mat-progress-bar>
              <p class="text-xs text-gray-400 mt-1 text-right">{{ planProgress | number:'1.0-0' }}% remaining</p>
            </div>

            <ng-template #noPlan>
              <div class="text-center py-8 text-gray-500">
                <mat-icon class="text-4xl mb-2" style="font-size:48px;height:48px;width:48px">credit_card_off</mat-icon>
                <p class="text-base mb-4">You have no active subscription.</p>
                <a mat-raised-button color="primary" routerLink="/masters/price-enquiries">View Plans</a>
              </div>
            </ng-template>
          </ng-container>
        </mat-card-content>
      </mat-card>

      <!-- Billing History table -->
      <mat-card class="shadow-sm">
        <mat-card-header>
          <mat-card-title class="text-lg font-semibold">Billing History</mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">

          <div *ngIf="loadingHistory" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <ng-container *ngIf="!loadingHistory">
            <div *ngIf="transactions.length === 0" class="text-center py-8 text-gray-400">
              No billing records found.
            </div>

            <table *ngIf="transactions.length > 0" mat-table [dataSource]="transactions" class="w-full">

              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef class="text-xs text-gray-500 uppercase">Date</th>
                <td mat-cell *matCellDef="let row" class="text-sm">{{ row.created_at | date:'medium' }}</td>
              </ng-container>

              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef class="text-xs text-gray-500 uppercase">Description</th>
                <td mat-cell *matCellDef="let row" class="text-sm">{{ row.description }}</td>
              </ng-container>

              <ng-container matColumnDef="method">
                <th mat-header-cell *matHeaderCellDef class="text-xs text-gray-500 uppercase">Method</th>
                <td mat-cell *matCellDef="let row" class="text-sm">{{ row.method ?? '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef class="text-xs text-gray-500 uppercase">Amount</th>
                <td mat-cell *matCellDef="let row" class="text-sm font-medium">
                  {{ row.amount | currency: 'INR' : 'symbol' : '1.2-2' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="payment_status">
                <th mat-header-cell *matHeaderCellDef class="text-xs text-gray-500 uppercase">Status</th>
                <td mat-cell *matCellDef="let row">
                  <span class="px-2 py-1 rounded-full text-xs font-semibold"
                        [ngClass]="row.payment_status === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'">
                    {{ row.payment_status === 1 ? 'Success' : 'Failed' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="reference_id">
                <th mat-header-cell *matHeaderCellDef class="text-xs text-gray-500 uppercase">Reference ID</th>
                <td mat-cell *matCellDef="let row" class="text-xs text-gray-500 font-mono">
                  {{ row.reference_id ?? '—' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;" class="hover:bg-gray-50"></tr>
            </table>

            <mat-paginator
              *ngIf="totalRecords > 0"
              [length]="totalRecords"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 15, 25, 50]"
              (page)="onPage($event)"
              showFirstLastButtons>
            </mat-paginator>
          </ng-container>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class PlanBillingComponent implements OnInit {
  currentPlan: any = null;
  loadingPlan = true;
  planProgress = 0;

  transactions: any[] = [];
  loadingHistory = true;
  totalRecords = 0;
  pageSize = 15;
  columns = ['created_at', 'description', 'method', 'amount', 'payment_status', 'reference_id'];

  constructor(private planService: PlanService) {}

  ngOnInit(): void {
    this.loadCurrentPlan();
    this.loadBillingHistory(1, this.pageSize);
  }

  private loadCurrentPlan(): void {
    this.planService.getMyCurrent().subscribe({
      next: (res) => {
        this.currentPlan = res;
        this.planProgress = this.calcProgress(res.starts_at, res.ends_at, res.days_remaining);
        this.loadingPlan = false;
      },
      error: () => {
        this.currentPlan = null;
        this.loadingPlan = false;
      }
    });
  }

  private loadBillingHistory(page: number, perPage: number): void {
    this.loadingHistory = true;
    this.planService.getMyBillingHistory(page, perPage).subscribe({
      next: (res) => {
        this.transactions = res.data ?? [];
        this.totalRecords = res.total ?? 0;
        this.pageSize = res.per_page ?? perPage;
        this.loadingHistory = false;
      },
      error: () => {
        this.transactions = [];
        this.loadingHistory = false;
      }
    });
  }

  onPage(event: PageEvent): void {
    this.loadBillingHistory(event.pageIndex + 1, event.pageSize);
  }

  cycleColor(cycle: string): string {
    const map: Record<string, string> = {
      month: 'bg-blue-500',
      year: 'bg-purple-500',
      custom: 'bg-orange-500'
    };
    return map[cycle?.toLowerCase()] ?? 'bg-gray-500';
  }

  private calcProgress(startsAt: string, endsAt: string, daysRemaining: number): number {
    const total = Math.max(1,
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86400000
    );
    return Math.min(100, (daysRemaining / total) * 100);
  }
}
