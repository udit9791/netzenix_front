import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface FareRule {
  id?: number;
  flight_inventory_id?: number;
  days_before_departure: number;
  refundable_amount: number;
}

@Injectable({
  providedIn: 'root'
})
export class FareRuleService {
  private apiUrl = `${environment.apiUrl}/fare-rules`;

  constructor(private http: HttpClient) { }

  getFareRules(flightInventoryId: number): Observable<FareRule[]> {
    return this.http.get<FareRule[]>(`${this.apiUrl}/by-flight/${flightInventoryId}`);
  }

  createFareRule(fareRule: FareRule): Observable<FareRule> {
    return this.http.post<FareRule>(this.apiUrl, fareRule);
  }

  updateFareRule(id: number, fareRule: FareRule): Observable<FareRule> {
    return this.http.put<FareRule>(`${this.apiUrl}/${id}`, fareRule);
  }

  deleteFareRule(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}