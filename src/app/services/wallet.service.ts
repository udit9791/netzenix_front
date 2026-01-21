import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface WalletBalance {
  balance: number;
  currency: string;
  credit_limit: number;
  credit_balance: number;
  is_active: boolean;
}

export interface WalletResponse {
  success: boolean;
  data: WalletBalance;
}

export interface TransactionDetail {
  referenceNumber: string;
  paymentType: string;
  invoiceNumber: string;
  convenienceFee: string;
  convenienceFeeGST: string;
  tds: string;
  grossCommission?: string;
  import?: string;
  travelDate?: string;
}

export interface Transaction {
  id: number;
  date: string;
  type: string;
  pnr: string;
  referenceId: string;
  amount: number;
  balance: number;
  expanded: boolean;
  transaction_type: string;
  payment_status: string;
  description?: string;
  attachment?: string;
  created_at: string;
  details?: TransactionDetail;
}

export interface TransactionPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from?: number;
  to?: number;
}

export interface TransactionResponse {
  success: boolean;
  data: Transaction[];
  pagination: TransactionPagination;
}

export interface PaymentStatus {
  id: number;
  name: string;
  is_active: number;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private apiUrl = environment.apiUrl;
  private balanceUpdated = new Subject<void>();
  
  balanceUpdated$ = this.balanceUpdated.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Fetch the user's wallet balance from the API
   */
  getWalletBalance(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(`${this.apiUrl}/wallet/balance`);
  }
  
  /**
   * Notify components that wallet balance has been updated
   */
  notifyBalanceUpdated(): void {
    this.balanceUpdated.next();
  }

  /**
   * Fetch the user's transaction history from the API with optional filters
   */
  getTransactionHistory(
    page: number = 1, 
    perPage: number = 10,
    paymentMode?: string,
    paymentStatus?: string,
    startDate?: string,
    endDate?: string,
    referenceNumber?: string
  ): Observable<TransactionResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (paymentMode && paymentMode !== 'all') {
      params = params.set('payment_mode', paymentMode);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      params = params.set('payment_status', paymentStatus);
    }

    if (startDate) {
      params = params.set('start_date', startDate);
    }

    if (endDate) {
      params = params.set('end_date', endDate);
    }

    if (referenceNumber && referenceNumber.trim()) {
      params = params.set('reference_number', referenceNumber.trim());
    }

    return this.http.get<TransactionResponse>(`${this.apiUrl}/wallet/transactions`, { params });
  }

  /**
   * Fetch payment statuses from the API
   */
  getPaymentStatuses(): Observable<PaymentStatus[]> {
    return this.http.get<PaymentStatus[]>(`${this.apiUrl}/payment-statuses`);
  }
}