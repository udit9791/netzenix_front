import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PluginService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Admin: list all plugin masters
  getPlugins(page = 1, perPage = 15, search = ''): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));
    if (search) params = params.set('search', search);
    return this.http.get(`${this.apiUrl}/plugins`, { params });
  }

  // Admin: create plugin master
  createPlugin(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/plugins`, payload);
  }

  // Admin: update plugin master
  updatePlugin(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/plugins/${id}`, payload);
  }

  // Tenant: get own plugin list
  getMyPlugins(): Observable<any> {
    return this.http.get(`${this.apiUrl}/plugins/my`);
  }

  // Tenant: toggle activate/deactivate
  activatePlugin(pluginMasterId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/plugins/${pluginMasterId}/activate`, {});
  }

  // Tenant: save integration credentials
  saveCredentials(pluginMasterId: number, values: Record<string, any>): Observable<any> {
    return this.http.post(`${this.apiUrl}/plugins/${pluginMasterId}/credentials`, values);
  }

  // Admin: get a specific tenant's plugin values
  getTenantPlugin(pluginMasterId: number, tenantId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/plugins/${pluginMasterId}/tenant/${tenantId}`);
  }

  // Admin: override any tenant plugin
  adminUpdatePlugin(tenantPluginId: number, payload: {
    is_active?: boolean;
    integration_values?: Record<string, any>;
    is_locked_by_master?: boolean;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/tenant-plugins/${tenantPluginId}/admin-update`, payload);
  }
}
