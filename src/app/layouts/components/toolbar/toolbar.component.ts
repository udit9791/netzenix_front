import {
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  inject,
  OnInit
} from '@angular/core';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { VexConfigService } from '@vex/config/vex-config.service';
import { filter, map, startWith, switchMap } from 'rxjs/operators';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { VexPopoverService } from '@vex/components/vex-popover/vex-popover.service';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';
import { Observable, of } from 'rxjs';
import { NavigationComponent } from '../navigation/navigation.component';
import { ToolbarUserComponent } from './toolbar-user/toolbar-user.component';
import { ToolbarNotificationsComponent } from './toolbar-notifications/toolbar-notifications.component';
import { NavigationItemComponent } from '../navigation/navigation-item/navigation-item.component';
import { MatMenuModule } from '@angular/material/menu';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AsyncPipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationItem } from '../../../core/navigation/navigation-item.interface';
import { checkRouterChildsData } from '@vex/utils/check-router-childs-data';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { AddMoneyDialogComponent } from './add-money-dialog/add-money-dialog.component';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'vex-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    NgIf,
    RouterLink,
    MatMenuModule,
    NgClass,
    NgFor,
    NavigationItemComponent,
    ToolbarNotificationsComponent,
    ToolbarUserComponent,
    NavigationComponent,
    AsyncPipe,
    DecimalPipe
  ]
})
export class ToolbarComponent implements OnInit {
  @HostBinding('class.shadow-b')
  showShadow: boolean = false;

  // Wallet properties
  walletAmount: number = 5000.0;
  walletCreditBalance: number = 0.0;
  isWalletRoute: boolean = false;
  userPermissions: string[] = [];

  navigateToWallet() {
    this.router.navigate(['/wallet']);
  }

  openAddMoneyDialog() {
    const dialogRef = this.dialog.open(AddMoneyDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe((success) => {
      if (success) {
        console.log('Payment amount stored in sessionStorage');
        // Navigate to payment page without query parameters
        this.router.navigate(['/payment']);
      }
    });
  }

  navigationItems$: Observable<NavigationItem[]> =
    this.navigationService.items$;

  isHorizontalLayout$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.layout === 'horizontal')
  );
  isVerticalLayout$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.layout === 'vertical')
  );
  isNavbarInToolbar$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.navbar.position === 'in-toolbar')
  );
  isNavbarBelowToolbar$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.navbar.position === 'below-toolbar')
  );
  userVisible$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.toolbar.user.visible)
  );
  title$: Observable<string> = this.configService.select(
    (config) => config.sidenav.title
  );

  isDesktop$: Observable<boolean> = this.layoutService.isDesktop$;
  megaMenuOpen$: Observable<boolean> = of(false);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor(
    private layoutService: VexLayoutService,
    private configService: VexConfigService,
    private navigationService: NavigationService,
    private popoverService: VexPopoverService,
    private router: Router,
    private dialog: MatDialog,
    private walletService: WalletService
  ) {}

  ngOnInit() {
    this.userPermissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );
    // Fetch wallet balance from API
    this.loadWalletBalance();

    // Listen for wallet balance updates
    this.walletService.balanceUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadWalletBalance();
      });

    // Check if current route is wallet
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.isWalletRoute = event.url === '/wallet';
      });

    // Initialize with current route
    this.isWalletRoute = this.router.url === '/wallet';
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.showShadow = checkRouterChildsData(
          this.router.routerState.root.snapshot,
          (data) => data.toolbarShadowEnabled ?? false
        );
      });
  }

  openQuickpanel(): void {
    this.layoutService.openQuickpanel();
  }

  openSidenav(): void {
    this.layoutService.openSidenav();
  }

  openMegaMenu(origin: ElementRef | HTMLElement): void {
    this.megaMenuOpen$ = of(
      this.popoverService.open({
        content: MegaMenuComponent,
        origin,
        offsetY: 12,
        position: [
          {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top'
          },
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top'
          }
        ]
      })
    ).pipe(
      switchMap((popoverRef) => popoverRef.afterClosed$.pipe(map(() => false))),
      startWith(true)
    );
  }

  openSearch(): void {
    this.layoutService.openSearch();
  }

  /**
   * Load wallet balance from API
   */
  private loadWalletBalance(): void {
    this.walletService.getWalletBalance().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.walletAmount = response.data.balance;
          this.walletCreditBalance = response.data.credit_balance;
        }
      },
      error: (error) => {
        console.error('Failed to load wallet balance:', error);
        // Keep default values if API fails
      }
    });
  }

  hasPermission(perm: string): boolean {
    return this.userPermissions.includes(perm);
  }
}
