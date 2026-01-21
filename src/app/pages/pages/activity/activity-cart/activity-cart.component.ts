import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
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
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective
  ]
})
export class ActivityCartComponent implements OnInit {
  items: ActivityCartItem[] = [];
  subtotal = 0;

  constructor(
    private cartService: ActivityCartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  backToSearch(): void {
    this.router.navigate(['/activities/search']);
  }

  proceedToBooking(): void {
    if (!this.items.length) {
      return;
    }
    this.router.navigate(['/activities/checkout']);
  }

  incrementAdult(index: number): void {
    const item = this.items[index];
    if (!item) return;
    const maxA = item.maxAdults;
    const nextAdults = item.adults + 1;
    if (maxA !== null && maxA !== undefined && nextAdults > maxA) {
      return;
    }
    this.cartService.updateCounts(index, nextAdults, item.children);
    this.reload();
  }

  decrementAdult(index: number): void {
    const item = this.items[index];
    if (!item) return;
    if (item.adults <= 1) return;
    const nextAdults = item.adults - 1;
    this.cartService.updateCounts(index, nextAdults, item.children);
    this.reload();
  }

  incrementChild(index: number): void {
    const item = this.items[index];
    if (!item) return;
    const maxC = item.maxChildren;
    const nextChildren = item.children + 1;
    if (maxC !== null && maxC !== undefined && nextChildren > maxC) {
      return;
    }
    this.cartService.updateCounts(index, item.adults, nextChildren);
    this.reload();
  }

  decrementChild(index: number): void {
    const item = this.items[index];
    if (!item) return;
    if (item.children <= 0) return;
    const nextChildren = item.children - 1;
    this.cartService.updateCounts(index, item.adults, nextChildren);
    this.reload();
  }

  removeItem(index: number): void {
    this.cartService.removeItem(index);
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
