import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = environment.apiUrl;
  private appInfo: any | null = null;
  private readonly APP_INFO_STORAGE_KEY = 'tenant_app_info';
  private readonly APP_INFO_TIMESTAMP_KEY = 'tenant_app_info_ts';
  private readonly APP_INFO_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(private http: HttpClient) {}

  getTenants(
    page: number = 1,
    perPage: number = 10,
    search: string = '',
    sortField: string = 'id',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage))
      .set('sort_field', sortField)
      .set('sort_order', sortOrder);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get(`${this.apiUrl}/tenants`, { params });
  }

  getAppInfo(forceRefresh: boolean = false): Observable<any> {
    if (this.appInfo && !forceRefresh) {
      return of(this.appInfo);
    }

    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem(this.APP_INFO_STORAGE_KEY);
        const tsRaw = window.localStorage.getItem(this.APP_INFO_TIMESTAMP_KEY);
        if (cached && tsRaw) {
          const ts = Number(tsRaw);
          if (!isNaN(ts) && Date.now() - ts < this.APP_INFO_TTL_MS) {
            this.appInfo = JSON.parse(cached);
            return of(this.appInfo);
          } else {
            window.localStorage.removeItem(this.APP_INFO_STORAGE_KEY);
            window.localStorage.removeItem(this.APP_INFO_TIMESTAMP_KEY);
          }
        }
      } catch {}
    }

    return this.http.get(`${this.apiUrl}/tenant/app-info`).pipe(
      map((resp: any) => {
        const data = resp?.data || null;
        if (data) {
          const logoPath = data.logo || null;
          const normalizedLogoPath =
            logoPath && typeof logoPath === 'string'
              ? logoPath.replace(/^\/+/, '')
              : null;
          const logoUrl =
            normalizedLogoPath !== null
              ? environment.imgUrl + normalizedLogoPath
              : null;
          this.appInfo = {
            ...data,
            logoUrl
          };
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(
                this.APP_INFO_STORAGE_KEY,
                JSON.stringify(this.appInfo)
              );
              window.localStorage.setItem(
                this.APP_INFO_TIMESTAMP_KEY,
                String(Date.now())
              );
              if (this.appInfo.app_name) {
                window.localStorage.setItem(
                  'tenant_app_name',
                  String(this.appInfo.app_name)
                );
              }
            } catch {}
          }
        } else {
          this.appInfo = null;
        }
        return this.appInfo;
      })
    );
  }

  getCachedAppInfo(): any | null {
    return this.appInfo;
  }

  createTenant(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tenants`, payload);
  }

  updateTenant(id: number, payload: any): Observable<any> {
    if (payload instanceof FormData) {
      if (!payload.has('_method')) {
        payload.append('_method', 'PUT');
      }
      return this.http.post(`${this.apiUrl}/tenants/${id}`, payload);
    }
    return this.http.put(`${this.apiUrl}/tenants/${id}`, payload);
  }
}
