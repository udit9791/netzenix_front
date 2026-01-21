import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Airline {
  id: number;
  code: string;
  name: string;
  is_active?: boolean;
  logo?: string;
}

export interface AirlineListResponse {
  data: Airline[];
  total: number;
  current_page: number;
  per_page: number;
}

@Injectable({
  providedIn: 'root'
})
export class AirlineService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Get paginated list of airlines
  getAirlines(page: number = 1, limit: number = 10, sortField: string = 'name', sortOrder: string = 'asc', search: string = ''): Observable<AirlineListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sortField', sortField)
      .set('sortOrder', sortOrder);
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<AirlineListResponse>(`${this.apiUrl}/airlines/list`, { params });
  }

  // Get all airlines (for dropdowns)
  getAllAirlines(): Observable<Airline[]> {
    return this.http.get<Airline[]>(`${this.apiUrl}/airlines`);
  }
  
  // Search airlines (for dropdowns)
  searchAirlines(query: string): Observable<Airline[]> {
    return this.http.get<Airline[]>(`${this.apiUrl}/airlines/search`, {
      params: { query }
    });
  }
  
  // Toggle airline status
  toggleAirlineStatus(id: number): Observable<Airline> {
    return this.http.put<Airline>(`${this.apiUrl}/airlines/${id}/toggle-status`, {});
  }
  
  // Get airline by ID
  getAirlineById(id: number): Observable<Airline> {
    return this.http.get<Airline>(`${this.apiUrl}/airlines/${id}`);
  }
  
  // Create new airline
  createAirline(airline: Partial<Airline>): Observable<Airline> {
    return this.http.post<Airline>(`${this.apiUrl}/airlines`, airline);
  }
  
  // Create a new airline with logo
  createAirlineWithLogo(formData: FormData): Observable<Airline> {
    return this.http.post<Airline>(`${this.apiUrl}/airlines`, formData);
  }
  
  // Update airline
  updateAirline(id: number, airline: Partial<Airline>): Observable<Airline> {
    return this.http.put<Airline>(`${this.apiUrl}/airlines/${id}`, airline);
  }
  
  // Update an existing airline with logo
  updateAirlineWithLogo(id: number, formData: FormData): Observable<Airline> {
    return this.http.put<Airline>(`${this.apiUrl}/airlines/${id}`, formData);
  }
  
  // Delete airline
  deleteAirline(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/airlines/${id}`);
  }

  // Toggle airline status (alternative method name)
  toggleStatus(id: number): Observable<Airline> {
    return this.http.patch<Airline>(`${this.apiUrl}/airlines/${id}/toggle-status`, {});
  }
}