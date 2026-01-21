import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** 🔹 Get all roles */
  getRoles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles`);
  }

  /** 🔹 Get all available permissions */
  getPermissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions`);
  }

  /** 🔹 Get assigned permissions of a specific role */
  getRolePermissions(roleId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles/${roleId}/permissions`);
  }

  /** 🔹 Assign permissions to a role */
  assignPermissions(roleId: number, permissions: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles/${roleId}/assign-permissions`, {
      permissions
    });
  }

  createRole(roleData: {
    name: string;
    description?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles`, roleData);
  }
}
