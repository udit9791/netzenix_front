import { LayoutComponent } from './layouts/layout/layout.component';
import { VexRoutes } from '@vex/interfaces/vex-route.interface';
import { SpecialFlightComponent } from './pages/pages/flights/special-flight/special-flight.component';
import { SpecialFlightBookingComponent } from './pages/pages/flights/special-flight-booking/special-flight-booking.component';
import { FlightGroupComponent } from './pages/pages/flights/flight-group-request/flight-group-request.component';
import { FttPackagesComponent } from './pages/pages/holiday/ftt-packages/ftt-packages.component';
import { GroupTourComponent } from './pages/pages/holiday/group-tour/group-tour.component';
import { AdhocGroupComponent } from './pages/pages/holiday/adhoc-group/adhoc-group.component';
import { PrivateToursComponent } from './pages/pages/holiday/private-tours/private-tours.component';
import { ProfileComponent } from './pages/pages/profile/profile.component';
import { PaymentComponent } from './pages/payment/payment.component';
import { PaymentComponent as FlightsPaymentComponent } from './pages/pages/flights/payment/payment.component';
import { TicketPrintComponent } from './pages/ticket-print/ticket-print.component';

// 👇 Import the guard
import { PermissionGuard } from './core/guards/permission.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const appRoutes: VexRoutes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: 'payment',
        component: PaymentComponent
      },
      {
        path: 'activities/search',
        loadComponent: () =>
          import(
            './pages/pages/activity/activity-search/activity-search.component'
          ).then((m) => m.ActivitySearchComponent)
      },
      {
        path: 'activities/cart',
        loadComponent: () =>
          import(
            './pages/pages/activity/activity-cart/activity-cart.component'
          ).then((m) => m.ActivityCartComponent)
      },
      {
        path: 'activities/checkout',
        loadComponent: () =>
          import(
            './pages/pages/activity/activity-checkout/activity-checkout.component'
          ).then((m) => m.ActivityCheckoutComponent)
      },
      {
        path: 'activities/:id',
        loadComponent: () =>
          import(
            './pages/pages/activity/activity-detail/activity-detail.component'
          ).then((m) => m.ActivityDetailComponent)
      },
      {
        path: 'sale/hotel-access',
        loadComponent: () =>
          import('./pages/pages/sale/hotel-access/hotel-access.component').then(
            (m) => m.HotelAccessComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_hotel_access' }
      },
      {
        path: 'sale/hotel-request',
        loadComponent: () =>
          import(
            './pages/pages/sale/hotel-request/hotel-request.component'
          ).then((m) => m.HotelRequestComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_hotel_access' }
      },
      {
        path: 'ticket-print/:id',
        component: TicketPrintComponent
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'manage_profile' }
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import(
            './pages/pages/change-password/change-password.component'
          ).then((m) => m.ChangePasswordComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'change_password' } // or create 'change_password'
      },

      // ✅ Role & Permission Routes
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/pages/users/user-list/user-list.component').then(
            (m) => m.UserListComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_users' }
      },
      {
        path: 'users/create',
        loadComponent: () =>
          import('./pages/pages/users/create-user/create-user.component').then(
            (m) => m.CreateUserComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'create_users' }
      },
      {
        path: 'users/edit/:id',
        loadComponent: () =>
          import('./pages/pages/users/edit-user/edit-user.component').then(
            (m) => m.EditUserComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'create_users' }
      },
      {
        path: 'permissions',
        loadComponent: () =>
          import('./pages/pages/permissions/permissions.component').then(
            (m) => m.PermissionsComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_permissions' }
      },

      // ✅ Flights
      {
        path: 'flights/special',
        component: SpecialFlightComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_flights' }
      },
      {
        path: 'flights/special-booking/:id',
        component: SpecialFlightBookingComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_flights' }
      },
      {
        path: 'flights/payment/:id',
        component: FlightsPaymentComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_flights' }
      },
      {
        path: 'flights/payment-confirmation/:id',
        redirectTo: 'flights/booking-confirmation/:id',
        pathMatch: 'full'
      },
      {
        path: 'hotels/create',
        loadComponent: () =>
          import(
            './pages/pages/hotels/create-hotel/create-hotel.component'
          ).then((m) => m.CreateHotelComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_sales' }
      },
      {
        path: 'hotels/search',
        loadComponent: () =>
          import(
            './pages/pages/hotels/hotel-search/hotel-search.component'
          ).then((m) => m.HotelSearchComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_search_hotel' }
      },
      {
        path: 'hotels/detail',
        loadComponent: () =>
          import(
            './pages/pages/hotels/hotel-detail/hotel-detail.component'
          ).then((m) => m.HotelDetailComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_search_hotel' }
      },
      {
        path: 'hotels/booking-confirmation',
        loadComponent: () =>
          import(
            './pages/pages/hotels/hotel-booking-confirmation/hotel-booking-confirmation.component'
          ).then((m) => m.HotelBookingConfirmationComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_search_hotel' }
      },
      {
        path: 'flights/booking-confirmation/:id',
        loadComponent: () =>
          import(
            './pages/payment-confirmation/payment-confirmation.component'
          ).then((m) => m.PaymentConfirmationComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_flights' }
      },
      {
        path: 'flights/group-request',
        component: FlightGroupComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_flights' }
      },
      {
        path: 'flight/booking',
        loadComponent: () =>
          import('./pages/pages/flights/booking/booking.component').then(
            (m) => m.BookingComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_flights' }
      },

      // ✅ Holidays
      {
        path: 'holiday/ftt-packages',
        component: FttPackagesComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_holidays' }
      },
      {
        path: 'holiday/group-tour',
        component: GroupTourComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_holidays' }
      },
      {
        path: 'holiday/adhoc-group',
        component: AdhocGroupComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_holidays' }
      },
      {
        path: 'holiday/private-tours',
        component: PrivateToursComponent,
        canActivate: [PermissionGuard],
        data: { permission: 'view_holidays' }
      },

      // ✅ Sales
      {
        path: 'sale/manage-flight-series',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-flight-series/manage-flight-series.component'
          ).then((m) => m.ManageFlightSeriesComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_flight_inventory' }
      },
      {
        path: 'sale/manage-activity',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-activity/activity-list.component'
          ).then((m) => m.ActivityListComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_flight_inventory' }
      },
      {
        path: 'sale/manage-activity/add',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-activity/manage-activity.component'
          ).then((m) => m.ManageActivityComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_flight_inventory' }
      },
      {
        path: 'sale/manage-activity/edit/:id',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-activity/manage-activity.component'
          ).then((m) => m.ManageActivityComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_flight_inventory' }
      },
      {
        path: 'sale/manage-fd-bookings',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-fd-bookings/manage-fd-bookings.component'
          ).then((m) => m.ManageFdBookingsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_sales' }
      },
      {
        path: 'sale/hotels',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-hotels/manage-hotels.component'
          ).then((m) => m.ManageHotelsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_hotels' }
      },
      {
        path: 'sale/hotel-inventory-management',
        loadComponent: () =>
          import(
            './pages/pages/sale/hotel-inventory-management/hotel-inventory-management.component'
          ).then((m) => m.HotelInventoryManagementComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_normal_hotel_inventory' }
      },
      {
        path: 'sale/hotel-inventory-management/add',
        loadComponent: () =>
          import(
            './pages/pages/sale/hotel-inventory-management/add-hotel-inventory.component'
          ).then((m) => m.AddHotelInventoryComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'create_normal_hotel_inventory' }
      },
      {
        path: 'sale/hotel-inventory-management/edit-date-inventory',
        loadComponent: () =>
          import(
            './pages/pages/sale/hotel-inventory-management/edit-date-inventory.component'
          ).then((m) => m.EditDateInventoryComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'edit_normal_hotel_inventory' }
      },
      {
        path: 'sale/hotel-inventory-management/update-pricing',
        loadComponent: () =>
          import(
            './pages/pages/sale/hotel-inventory-management/update-pricing.component'
          ).then((m) => m.UpdatePricingComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'edit_normal_hotel_inventory' }
      },
      {
        path: 'sale/add-hotel',
        loadComponent: () =>
          import('./pages/pages/sale/add-hotel/add-hotel.component').then(
            (m) => m.AddHotelComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'edit_normal_hotel_inventory' }
      },
      {
        path: 'sale/manage-bookings',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-bookings/manage-bookings.component'
          ).then((m) => m.ManageBookingsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_sales' }
      },
      {
        path: 'sale/add-flight-inventory',
        loadComponent: () =>
          import(
            './pages/pages/sale/add-flight-inventory/add-flight-inventory.component'
          ).then((m) => m.AddFlightInventoryComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'create_flight_inventory' }
      },
      {
        path: 'sale/update-flight-details',
        loadComponent: () =>
          import(
            './pages/pages/sale/update-flight-details/update-flight-details.component'
          ).then((m) => m.UpdateFlightDetailsComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'edit_flight_inventory' }
      },
      {
        path: 'sale/manage-invoice',
        loadComponent: () =>
          import(
            './pages/pages/sale/manage-invoice/manage-invoice.component'
          ).then((m) => m.ManageInvoiceComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'view_sales' }
      },

      // ✅ Transactions (top-level)
      {
        path: 'transactions',
        loadComponent: () =>
          import('./pages/transactions/transactions.component').then(
            (m) => m.TransactionsComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_sales' }
      },
      {
        path: 'transactions/cancel-requests',
        loadComponent: () =>
          import('./pages/cancel-requests/cancel-requests.component').then(
            (m) => m.CancelRequestsComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_sales' }
      },

      // ✅ Masters
      {
        path: 'masters',
        canActivate: [PermissionGuard],
        data: { permission: 'view_amenities' },
        children: [
          {
            path: 'airline',
            loadChildren: () =>
              import('./pages/pages/masters/airline/airline.module').then(
                (m) => m.AirlineModule
              )
          },
          {
            path: 'tenant-plans',
            loadComponent: () =>
              import(
                './pages/pages/masters/plans/tenant-plan-list/tenant-plan-list.component'
              ).then((m) => m.TenantPlanListComponent)
          },
          {
            path: 'user-plans',
            loadComponent: () =>
              import(
                './pages/pages/masters/plans/user-plan-list/user-plan-list.component'
              ).then((m) => m.UserPlanListComponent)
          },
          {
            path: 'airport',
            loadComponent: () =>
              import(
                './pages/pages/masters/airport/airport-list/airport-list.component'
              ).then((m) => m.AirportListComponent)
          },
          {
            path: 'amenity',
            loadComponent: () =>
              import(
                './pages/pages/masters/amenity/amenity-list/amenity-list.component'
              ).then((m) => m.AmenityListComponent)
          },
          {
            path: 'hotel-option',
            loadComponent: () =>
              import(
                './pages/pages/masters/hotel-option/hotel-option-list/hotel-option-list.component'
              ).then((m) => m.HotelOptionListComponent)
          },
          {
            path: 'hotel',
            loadComponent: () =>
              import(
                './pages/pages/masters/hotel/hotel-list/hotel-list.component'
              ).then((m) => m.HotelListComponent)
          },
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'airline'
          }
        ]
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./pages/wallet/wallet.component').then(
            (m) => m.WalletComponent
          ),
        canActivate: [PermissionGuard],
        data: { permission: 'view_wallet' }
      },
      {
        path: 'payment-confirmation',
        loadComponent: () =>
          import(
            './pages/payment-confirmation/payment-confirmation.component'
          ).then((m) => m.PaymentConfirmationComponent)
      },
      {
        path: 'payment-confirmation/:id',
        loadComponent: () =>
          import(
            './pages/payment-confirmation/payment-confirmation.component'
          ).then((m) => m.PaymentConfirmationComponent)
      },
      {
        path: 'my-bookings',
        loadComponent: () =>
          import('./pages/my-bookings/my-bookings.component').then(
            (m) => m.MyBookingsComponent
          )
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/pages/auth/login/login.component').then(
        (m) => m.LoginComponent
      )
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/pages/auth/register/register.component').then(
        (m) => m.RegisterComponent
      )
  }
];
