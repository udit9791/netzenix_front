import { Injectable } from '@angular/core';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { NavigationItem } from './navigation-item.interface';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationLoaderService {
  private readonly _items: BehaviorSubject<NavigationItem[]> =
    new BehaviorSubject<NavigationItem[]>([]);

  get items$(): Observable<NavigationItem[]> {
    return this._items.asObservable();
  }

  // ⬇️ Replace with real AuthService later (API/State)
  private userPermissions: string[] = [];

  constructor(private readonly layoutService: VexLayoutService) {
    // Example: load permissions from localStorage after login
    this.userPermissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );
    this.loadNavigation();
  }

  private hasPermission(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }

  loadNavigation(): void {
    console.log('🔑 User Permissions:', this.userPermissions);
    const nav: NavigationItem[] = [];

    // ✅ Always show dashboard
    nav.push({
      type: 'subheading',
      label: 'Dashboards',
      children: [
        {
          type: 'link',
          label: 'Analytics',
          route: '/',
          icon: 'mat:insights',
          routerLinkActiveOptions: { exact: true }
        }
      ]
    });

    // ✅ Role & Permission section
    if (this.hasPermission('view_roles') || this.hasPermission('view_users')) {
      nav.push({
        type: 'subheading',
        label: 'Role & Permission',
        children: [
          this.hasPermission('view_users') && {
            type: 'link',
            label: 'User List',
            route: '/users',
            icon: 'mat:people'
          },
          this.hasPermission('create_users') && {
            type: 'link',
            label: 'Add User',
            route: '/users/create',
            icon: 'mat:person_add'
          },
          this.hasPermission('view_permissions') && {
            type: 'link',
            label: 'Permissions',
            route: '/permissions',
            icon: 'mat:security'
          }
        ].filter(Boolean) as NavigationItem[]
      });
    }

    if (
      this.hasPermission('view_normal_hotel_search') ||
      this.hasPermission('view_confirm_hotel_search')
    ) {
      const hotelChildren: NavigationItem[] = [];
      if (this.hasPermission('view_normal_hotel_search')) {
        hotelChildren.push({
          type: 'link',
          label: 'Hotel',
          route: '/hotels/search',
          queryParams: { type: 'normal' },
          icon: 'mat:search'
        });
      }
      if (this.hasPermission('view_confirm_hotel_search')) {
        hotelChildren.push({
          type: 'link',
          label: 'Confirm Hotel',
          route: '/hotels/search',
          queryParams: { type: 'confirm' },
          icon: 'mat:search'
        });
      }
      if (hotelChildren.length) {
        nav.push({
          type: 'subheading',
          label: 'Hotel',
          children: hotelChildren
        });
      }
    }

    // ✅ Flights section
    if (this.hasPermission('view_flights_search')) {
      nav.push({
        type: 'subheading',
        label: 'Flights',
        children: [
          {
            type: 'link',
            label: 'Special Flight',
            route: '/flights/special',
            icon: 'mat:flight_takeoff'
          }
          // {
          //   type: 'link',
          //   label: 'Flight Group Request',
          //   route: '/flights/group-request',
          //   icon: 'mat:groups'
          // }
        ]
      });
    }

    // ✅ Holidays section
    if (this.hasPermission('view_flights_search')) {
      nav.push({
        type: 'subheading',
        label: 'Holidays',
        children: [
          // {
          //   type: 'link',
          //   label: 'Fit Packages',
          //   route: '/holiday/ftt-packages',
          //   icon: 'mat:flight_takeoff'
          // },
          {
            type: 'link',
            label: 'Group Tours',
            route: '/holiday/group-tour',
            icon: 'mat:groups'
          }
          // {
          //   type: 'link',
          //   label: 'Adhoc Group',
          //   route: '/holiday/adhoc-group',
          //   icon: 'mat:group_add'
          // },
          // {
          //   type: 'link',
          //   label: 'Private Tours',
          //   route: '/holiday/private-tours',
          //   icon: 'mat:directions_car'
          // }
        ]
      });
    }

    // ✅ Activities section (search)
    if (this.hasPermission('view_activity')) {
      nav.push({
        type: 'subheading',
        label: 'Activities',
        children: [
          {
            type: 'link',
            label: 'Activity Search',
            route: '/activities/search',
            icon: 'mat:search'
          }
        ]
      });
    }

    // ✅ Sales section
    if (
      this.hasPermission('view_flight_inventory') ||
      this.hasPermission('view_confirm_hotel_inventory') ||
      this.hasPermission('view_normal_hotel_inventory')
    ) {
      nav.push({
        type: 'subheading',
        label: 'Sale',
        children: [
          this.hasPermission('view_flight_inventory') && {
            type: 'link',
            label: 'Manage Flight Series',
            route: '/sale/manage-flight-series',
            icon: 'mat:flight'
          },
          this.hasPermission('view_hotels') && {
            type: 'link',
            label: 'Hotels',
            route: '/sale/hotels',
            icon: 'mat:hotel'
          },
          this.hasPermission('view_normal_hotel_inventory') && {
            type: 'link',
            label: 'Hotel Inventory',
            route: '/sale/hotel-inventory-management',
            queryParams: { type: 'normal' },
            icon: 'mat:inventory_2'
          },
          this.hasPermission('view_confirm_hotel_inventory') && {
            type: 'link',
            label: 'Confirm Hotel Inventory',
            route: '/sale/hotel-inventory-management',
            queryParams: { type: 'confirm' },
            icon: 'mat:inventory_2'
          },
          this.hasPermission('view_hotel_access') && {
            type: 'link',
            label: 'Hotel Access',
            route: '/sale/hotel-access',
            icon: 'mat:supervisor_account'
          },
          this.hasPermission('view_hotel_access') && {
            type: 'link',
            label: 'Hotel Request',
            route: '/sale/hotel-request',
            icon: 'mat:assignment'
          },
          this.hasPermission('view_hotel_access') && {
            type: 'link',
            label: 'Manage Bookings',
            route: '/sale/manage-bookings',
            icon: 'mat:book_online'
          },
          this.hasPermission('view_activity') && {
            type: 'link',
            label: 'Manage Activity',
            route: '/sale/manage-activity',
            icon: 'mat:event_note'
          },
          this.hasPermission('view_activity') && {
            type: 'link',
            label: 'Activity Bookings',
            route: '/sale/activity-bookings',
            icon: 'mat:fact_check'
          },
          this.hasPermission('view_flight_inventory') && {
            type: 'link',
            label: 'Transportation',
            route: '/sale/transportation',
            icon: 'mat:directions_bus'
          },
          this.hasPermission('view_flight_inventory') && {
            type: 'link',
            label: 'Itinerary Builder',
            route: '/sale/itinerary-builder',
            icon: 'mat:playlist_add_check'
          }
        ].filter(Boolean) as NavigationItem[]
      });
    }

    // ✅ Transactions section (separate)
    if (
      this.hasPermission('view_transections') ||
      this.hasPermission('view_cancel_request')
    ) {
      nav.push({
        type: 'subheading',
        label: 'Transactions',
        children: [
          this.hasPermission('view_transections') && {
            type: 'link',
            label: 'Transactions',
            route: '/transactions',
            icon: 'mat:payments'
          },
          this.hasPermission('view_cancel_request') && {
            type: 'link',
            label: 'Cancel Requests',
            route: '/transactions/cancel-requests',
            icon: 'mat:cancel'
          }
        ].filter(Boolean) as NavigationItem[]
      });
    }

    // ✅ Masters
    if (
      this.hasPermission('view_tenant') ||
      this.hasPermission('view_airline') ||
      this.hasPermission('view_tenant_plans') ||
      this.hasPermission('view_airport') ||
      this.hasPermission('view_amenities') ||
      this.hasPermission('view_hotel_option') ||
      this.hasPermission('view_hotel_master') ||
      this.hasPermission('view_plugins')
    ) {
      nav.push({
        type: 'subheading',
        label: 'Masters',
        children: [
          this.hasPermission('view_tenant') && {
            type: 'link',
            label: 'Tenants',
            route: '/masters/tenant',
            icon: 'mat:business'
          },
          this.hasPermission('view_airline') && {
            type: 'link',
            label: 'Airline',
            route: '/masters/airline',
            icon: 'mat:flight'
          },
          this.hasPermission('view_tenant_plans') && {
            type: 'link',
            label: 'Tenant Plans',
            route: '/masters/tenant-plans',
            icon: 'mat:assignment'
          },
          // this.hasPermission('view_tenant_plans') && {
          //   type: 'link',
          //   label: 'User Plans',
          //   route: '/masters/user-plans',
          //   icon: 'mat:assignment_ind'
          // },
          this.hasPermission('view_price_enquiry') && {
            type: 'link',
            label: 'Price Enquiries',
            route: '/masters/price-enquiries',
            icon: 'mat:contact_mail'
          },
          this.hasPermission('view_airport') && {
            type: 'link',
            label: 'Airport',
            route: '/masters/airport',
            icon: 'mat:location_on'
          },
          this.hasPermission('view_amenities') && {
            type: 'link',
            label: 'Amenities',
            route: '/masters/amenity',
            icon: 'mat:category'
          },
          this.hasPermission('view_hotel_option') && {
            type: 'link',
            label: 'Hotel Options',
            route: '/masters/hotel-option',
            icon: 'mat:list'
          },
          this.hasPermission('view_hotel_master') && {
            type: 'link',
            label: 'Hotels',
            route: '/masters/hotel',
            icon: 'mat:hotel'
          },
          this.hasPermission('view_commission_master') && {
            type: 'link',
            label: 'Commission',
            route: '/masters/commission',
            icon: 'mat:attach_money'
          },
          this.hasPermission('view_plugins') && {
            type: 'link',
            label: 'Plugins',
            route: '/masters/plugins',
            icon: 'mat:extension'
          }
        ].filter(Boolean) as NavigationItem[]
      });
    }

    // ✅ Settings (separate section)
    if (this.hasPermission('view_amenities')) {
      nav.push({
        type: 'subheading',
        label: 'Settings',
        children: [
          {
            type: 'link',
            label: 'Settings',
            route: '/masters/settings',
            icon: 'mat:settings'
          }
        ] as NavigationItem[]
      });
    }

    // ✅ My Bookings (top-level)
    if (this.hasPermission('view_my_booking')) {
      nav.push({
        type: 'link',
        label: 'My Bookings',
        route: '/my-bookings',
        icon: 'mat:book_online'
      });
    }

    // Billing & Plan section
    if (this.hasPermission('view_plan_billing')) {
      nav.push({
        type: 'subheading',
        label: 'Billing & Plan',
        children: [
          {
            type: 'link',
            label: 'Plan & Billing',
            route: '/plan-billing',
            icon: 'mat:receipt_long'
          }
        ] as NavigationItem[]
      });
    }

    // 🔥 finally push items
    this._items.next(nav);
  }
}
