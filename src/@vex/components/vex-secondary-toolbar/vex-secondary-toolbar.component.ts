import { Component, Input } from '@angular/core';
import { VexConfigService } from '../../config/vex-config.service';
import { filter, map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivityCartService } from 'src/app/core/services/activity-cart.service';

@Component({
  selector: 'vex-secondary-toolbar',
  template: `
    <div class="secondary-toolbar-placeholder">&nbsp;</div>

    <div
      [ngClass]="{ fixed: fixed$ | async, 'w-full': !(fixed$ | async) }"
      class="secondary-toolbar py-1 z-40 border-t flex">
      <div
        class="px-6 flex items-center flex-auto"
        [class.container]="isVerticalLayout$ | async">
        <h1
          *ngIf="current"
          class="subheading-2 font-medium m-0 ltr:pr-3 rtl:pl-3 ltr:border-r rtl:border-l ltr:mr-3 rtl:ml-3 flex-none">
          {{ current }}
        </h1>

        <ng-content></ng-content>

        <div
          class="flex items-center gap-2 ml-auto"
          *ngIf="showActivityCart$ | async">
          <button
            mat-icon-button
            class="activity-cart-button"
            (click)="openActivityCart()"
            aria-label="Activity cart"
            [matBadge]="(cartCount$ | async) || 0"
            matBadgeColor="accent"
            matBadgeSize="small"
            matBadgePosition="above after"
            matBadgeOverlap="true">
            <mat-icon>shopping_cart</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./vex-secondary-toolbar.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    AsyncPipe,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule
  ]
})
export class VexSecondaryToolbarComponent {
  @Input() current?: string;
  showActivityCart$: Observable<boolean>;
  cartCount$: Observable<number>;

  fixed$ = this.configService.config$.pipe(
    map((config) => config.toolbar.fixed)
  );

  isVerticalLayout$: Observable<boolean> = this.configService
    .select((config) => config.layout)
    .pipe(map((layout) => layout === 'vertical'));

  constructor(
    private readonly configService: VexConfigService,
    private readonly router: Router,
    private readonly activityCart: ActivityCartService,
    private readonly snackBar: MatSnackBar
  ) {
    this.showActivityCart$ = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => this.isActivitiesUrl(e.urlAfterRedirects || e.url)),
      startWith(this.isActivitiesUrl(this.router.url))
    );
    this.cartCount$ = this.activityCart.count$;
  }

  openActivityCart(): void {
    const items = this.activityCart.getItems();
    if (!items.length) {
      this.snackBar.open('Cart is empty', 'Close', {
        duration: 2000
      });
      return;
    }
    this.router.navigate(['/activities/cart']);
  }

  private isActivitiesUrl(url: string): boolean {
    if (!url) return false;
    const clean = url.split('?')[0];
    return clean.startsWith('/activities');
  }
}
