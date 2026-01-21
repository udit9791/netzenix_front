import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Create cash payment transaction (pending, credit) */
  addCashPayment(amount: number, walletId: number = 1, remarks?: string): Observable<any> {
    const payload: any = {
      amount,
      wallet_id: walletId,
      remarks: remarks ?? null
    };
    return this.http.post(`${this.apiUrl}/payment-transactions`, payload);
  }

  /** Create payment transaction with optional file attachment */
  createPaymentTransaction(amount: number, walletId: number = 1, remarks?: string, file?: File, paymentMethodId?: number): Observable<any> {
    const formData = new FormData();
    formData.append('amount', amount.toString());
    formData.append('wallet_id', walletId.toString());
    
    if (remarks) {
      formData.append('remarks', remarks);
    }
    
    if (file) {
      formData.append('attachment', file);
    }
    
    if (paymentMethodId) {
      formData.append('payment_method_id', paymentMethodId.toString());
    }
    
    return this.http.post(`${this.apiUrl}/payment-transactions`, formData);
  }

  /** List payment transactions (paginated) */
  listTransactions(
    page: number = 1,
    perPage: number = 10,
    status?: string | number,
    userId?: number,
    fromDate?: string,
    toDate?: string,
    search?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (status !== undefined && status !== null && status !== '') {
      params = params.set('status', String(status));
    }
    if (userId) {
      params = params.set('user_id', String(userId));
    }
    if (fromDate) {
      params = params.set('from_date', fromDate);
    }
    if (toDate) {
      params = params.set('to_date', toDate);
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get(`${this.apiUrl}/payment-transactions`, { params });
  }

  /** Fetch payment statuses for dropdown */
  getPaymentStatuses(): Observable<Array<{ id: number; name: string; is_active: number }>> {
    return this.http.get<Array<{ id: number; name: string; is_active: number }>>(
      `${this.apiUrl}/payment-statuses`
    );
  }

  /** Approve a transaction */
  approveTransaction(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-transactions/${id}/approve`, {});
  }

  /** Approve a transaction with credit limit timeline */
  approveTransactionWithCreditLimit(id: number, creditLimitId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-transactions/${id}/approve`, {
      credit_limit_id: creditLimitId
    });
  }

  /** Get credit limit timeline options */
  getCreditLimitTimelineOptions(): Observable<{ success: boolean; data: Array<{ id: number; name: string; days: number }> }> {
    return this.http.get<{ success: boolean; data: Array<{ id: number; name: string; days: number }> }>(
      `${this.apiUrl}/credit-limit-timeline/options`
    );
  }

  /** Reject a transaction with reason */
  rejectTransaction(id: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment-transactions/${id}/reject`, { reason });
  }

  /** Fetch payment methods for dropdown (only active methods with allow_file=1 and allow_remark=1) */
  getPaymentMethods(): Observable<Array<{ id: number; name: string; allow_file: number; allow_remark: number; is_active: number }>> {
    return this.http.get<{ success: boolean; data: Array<{ id: number; name: string; allow_file: number; allow_remark: number; is_active: number }> }>(
      `${this.apiUrl}/payment-methods`
    ).pipe(
      map(response => response.data || [])
    );
  }
}