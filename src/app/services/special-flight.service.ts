import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpecialFlightService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get commission data by user ID
   * @param userId The ID of the user to retrieve commission data for
   * @returns Observable with commission data
   */
  getCommissionData(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/commissions/user/${userId}`);
  }

  /**
   * Get commission by user ID (alias for getCommissionData)
   * @param userId The ID of the user to retrieve commission for
   * @returns Observable with commission data
   */
  getCommissionByUserId(userId: number): Observable<any> {
    return this.getCommissionData(userId);
  }

  /**
   * Get special flights from the API
   * @param params Optional query parameters (from, to, date)
   * @returns Observable with flight data
   */
  getSpecialFlights(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/special-flights`, { params });
  }

  checkExternalAvailability(payload: {
    ukey: string;
    rmkey: string[];
    sectyp?: string | null;
  }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/flights/external/availability-check`,
      payload
    );
  }

  /**
   * Get booking details by booking ID
   * @param bookingId The ID of the booking to retrieve
   * @returns Observable with booking details
   */
  getBookingDetails(bookingId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/bookings/${bookingId}`);
  }

  /**
   * Process payment for a booking
   * @param paymentData The payment data to process
   * @returns Observable with payment response
   */
  processPayment(paymentData: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/flights/payment/process`,
      paymentData
    );
  }
}
