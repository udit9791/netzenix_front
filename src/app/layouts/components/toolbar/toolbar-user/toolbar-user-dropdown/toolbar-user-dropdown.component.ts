import { Component, OnInit } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';

@Component({
  selector: 'vex-toolbar-user-dropdown',
  templateUrl: './toolbar-user-dropdown.component.html',
  styleUrls: ['./toolbar-user-dropdown.component.scss'],
  standalone: true,
  imports: [MatRippleModule, RouterLink, MatIconModule, NgIf]
})
export class ToolbarUserDropdownComponent implements OnInit {
  userPermissions: string[] = [];
  user: any = null;
  ngOnInit(): void {
    // ✅ Load permissions saved in localStorage (after login)
    this.userPermissions = JSON.parse(
      localStorage.getItem('permissions') || '[]'
    );
    const storedUser = localStorage.getItem('user');
    // console.log('user :' + storedUser);
    this.user = storedUser ? JSON.parse(storedUser) : null;
  }

  hasPermission(perm: string): boolean {
    return this.userPermissions.includes(perm);
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
  }
}
