import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import {
  ActivityCartItem,
  ActivityCartService
} from 'src/app/core/services/activity-cart.service';
import { ActivityService } from 'src/app/core/services/activity.service';

@Component({
  selector: 'vex-activity-cart',
  standalone: true,
  templateUrl: './activity-cart.component.html',
  styleUrls: ['./activity-cart.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent
  ]
})
export class ActivityCartComponent implements OnInit {
  items: ActivityCartItem[] = [];
  subtotal = 0;

  constructor(
    private cartService: ActivityCartService,
    private activityService: ActivityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  backToSearch(): void {
    this.router.navigate(['/activities/search']);
  }

  proceedToBooking(): void {
    if (!this.items.length) return;
    this.router.navigate(['/activities/checkout']);
  }

  incrementAdult(index: number): void {
    const item = this.items[index];
    if (!item) return;
    const maxA = item.maxAdults;
    const next = item.adults + 1;
    if (maxA != null && next > maxA) return;
    this.cartService.updateCounts(index, next, item.children);
    this.reload();
  }

  decrementAdult(index: number): void {
    const item = this.items[index];
    if (!item || item.adults <= 1) return;
    this.cartService.updateCounts(index, item.adults - 1, item.children);
    this.reload();
  }

  incrementChild(index: number): void {
    const item = this.items[index];
    if (!item) return;
    const maxC = item.maxChildren;
    const next = item.children + 1;
    if (maxC != null && next > maxC) return;
    this.cartService.updateCounts(index, item.adults, next);
    this.reload();
  }

  decrementChild(index: number): void {
    const item = this.items[index];
    if (!item || item.children <= 0) return;
    this.cartService.updateCounts(index, item.adults, item.children - 1);
    this.reload();
  }

  removeItem(index: number): void {
    const removed = this.cartService.popItem(index);
    if (removed?.lockId) {
      this.activityService
        .releaseInventory({ lock_id: removed.lockId })
        .subscribe({ next: () => {}, error: () => {} });
    }
    this.reload();
  }

  private reload(): void {
    this.items = this.cartService.getItems();
    this.subtotal = this.items.reduce((sum, item) => {
      const v = item.totalPrice ?? 0;
      return sum + (typeof v === 'number' ? v : 0);
    }, 0);
  }
}
