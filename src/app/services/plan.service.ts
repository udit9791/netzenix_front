import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTenantPlans(
    page: number = 1,
    perPage: number = 10,
    sortField: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    search: string = '',
    userType?: 'buyer' | 'seller',
    isActive?: boolean
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage))
      .set('sort_field', sortField)
      .set('sort_order', sortOrder);
    if (search) {
      params = params.set('search', search);
    }
    if (userType) {
      params = params.set('user_type', userType);
    }
    if (isActive !== undefined) {
      params = params.set('is_active', isActive ? '1' : '0');
    }
    return this.http.get(`${this.apiUrl}/tenant-user-plans`, { params });
  }

  getTenantPlan(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tenant-user-plans/${id}`);
  }

  createTenantPlan(payload: {
    name: string;
    user_type: 'buyer' | 'seller';
    price: number;
    tenant_id?: number | null;
    is_active?: boolean;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenant-user-plans`, payload);
  }

  updateTenantPlan(
    id: number,
    payload: {
      name: string;
      user_type: 'buyer' | 'seller';
      price: number;
      tenant_id?: number | null;
      is_active?: boolean;
    }
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/tenant-user-plans/${id}`, payload);
  }

  deleteTenantPlan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tenant-user-plans/${id}`);
  }

  toggleTenantPlanStatus(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/tenant-user-plans/${id}/toggle-status`, {});
  }

  getUserSubscriptions(
    page: number = 1,
    perPage: number = 10,
    sortField: string = 'starts_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    tenantId?: number,
    userId?: number,
    isActive?: boolean
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage))
      .set('sort_field', sortField)
      .set('sort_order', sortOrder);
    if (tenantId !== undefined && tenantId !== null) {
      params = params.set('tenant_id', String(tenantId));
    }
    if (userId !== undefined && userId !== null) {
      params = params.set('user_id', String(userId));
    }
    if (isActive !== undefined) {
      params = params.set('is_active', isActive ? '1' : '0');
    }
    return this.http.get(`${this.apiUrl}/user-subscriptions`, { params });
  }

  getUserSubscription(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user-subscriptions/${id}`);
  }

  createUserSubscription(payload: {
    user_id: number;
    tenant_user_plan_id: number;
    starts_at: string;
    ends_at?: string | null;
    is_active?: boolean;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/user-subscriptions`, payload);
  }

  updateUserSubscription(
    id: number,
    payload: {
      user_id: number;
      tenant_user_plan_id: number;
      starts_at: string;
      ends_at?: string | null;
      is_active?: boolean;
    }
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/user-subscriptions/${id}`, payload);
  }

  deleteUserSubscription(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user-subscriptions/${id}`);
  }

  toggleUserSubscriptionStatus(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/user-subscriptions/${id}/toggle-status`, {});
  }
}

