import { Component, OnInit } from '@angular/core';
import { VexPopoverRef } from '@vex/components/vex-popover/vex-popover-ref';
import { MatRippleModule } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common'; // 👈 import NgIf

@Component({
  selector: 'vex-sidenav-user-menu',
  templateUrl: './sidenav-user-menu.component.html',
  styleUrls: ['./sidenav-user-menu.component.scss'],
  standalone: true,
  imports: [MatRippleModule, RouterLink, MatIconModule, NgIf] // 👈 add NgIf here
})
export class SidenavUserMenuComponent implements OnInit {
  userPermissions: string[] = [];

  constructor(private readonly popoverRef: VexPopoverRef) {}

  ngOnInit(): void {
    // Load permissions from localStorage (after login)
    this.userPermissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );
  }

  hasPermission(perm: string): boolean {
    return this.userPermissions.includes(perm);
  }

  closePopover(): void {
    setTimeout(() => this.popoverRef.close(), 250);
  }

  logout(): void {
    // Remove auth and user-related keys
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('roles');
    // Remove booking-related cached data
    localStorage.removeItem('specialBookingData');
    localStorage.removeItem('hold_order_id');
    // Remove stored UI role config
    localStorage.removeItem('vex:selectedRoleConfig');
    // Clear session storage
    sessionStorage.clear();
    this.closePopover();
  }
}
