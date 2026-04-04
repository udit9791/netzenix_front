import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createUserWithRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/create-with-role`, data);
  }

  createSubUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sub-users`, data);
  }

  updateSubUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sub-users/${id}`, data);
  }

  getUsers(
    page: number = 1,
    perPage: number = 10,
    search: string = '',
    sortField: string = 'id',
    sortDirection: string = 'asc',
    tenantId?: number
  ): Observable<any> {
    const params: any = {
      page,
      per_page: perPage,
      search,
      sort_field: sortField,
      sort_direction: sortDirection
    };

    if (tenantId !== undefined && tenantId !== null) {
      params.tenant_id = tenantId;
    }

    return this.http.get(`${this.apiUrl}/users`, { params });
  }

  getSubUsers(
    page: number = 1,
    perPage: number = 10,
    search: string = ''
  ): Observable<any> {
    const params: any = {
      page,
      per_page: perPage
    };
    if (search) {
      params.search = search;
    }
    return this.http.get(`${this.apiUrl}/sub-users`, { params });
  }

  getSubUser(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/sub-users/${id}`);
  }

  getUsersForAutocomplete(
    search: string = '',
    role?: string,
    tenantId?: number,
    limit: number = 20
  ): Observable<any> {
    const params: any = {
      limit: String(limit)
    };
    if (search) {
      params.search = search;
    }
    if (role !== undefined && role !== '') {
      params.role = role;
    }
    if (tenantId !== undefined && tenantId !== null) {
      params.tenant_id = String(tenantId);
    }
    return this.http.get(`${this.apiUrl}/users/autocomplete`, { params });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  updateUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, data);
  }

  getUser(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`);
  }

  getUserDetail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}/detail`);
  }

  getUserPermissions(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}/permissions`);
  }

  assignUserPermissions(id: number, permissionIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/permissions`, {
      permission_ids: permissionIds
    });
  }

  getTenants(activeOnly: boolean = false): Observable<any> {
    const params: any = {};
    if (activeOnly) {
      params.active = '1';
    }
    return this.http.get(`${this.apiUrl}/tenants`, { params });
  }

  getRoles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles`);
  }

  approveUser(id: number, role: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/approve`, { role });
  }

  rejectUser(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${id}/reject`, {});
  }

  getCountries(): Observable<any> {
    return this.http.get(`${this.apiUrl}/countries/list`);
  }

  getStatesByCountry(countryId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/states/country/${countryId}`);
  }

  getCitiesByState(stateId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/cities/state/${stateId}`);
  }

  upsertLocation(payload: {
    country_name?: string;
    state_name?: string;
    city_name?: string;
    country_code?: string;
    state_code?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/location/upsert`, payload);
  }
}
