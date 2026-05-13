import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'vex-payment',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    RouterModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule
  ],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnInit, OnDestroy {
  amount: number = 0;
  selectedPaymentMethod: string = '';
  
  // Payment methods from database
  paymentMethods: Array<{ id: number; name: string; allow_file: number; allow_remark: number; is_active: number }> = [];
  
  // Wire transfer properties
  receiptId: string = '';
  receiptIds: string[] = [];
  
  // Cheque properties
  chequeNo: string = '';
  chequeNos: string[] = [];
  bankName: string = '';
  
  // Cash properties
  cashRemarks: string = '';
  
  // File upload properties
  remarks: string = '';
  
  selectedFile: File | null = null;
  
  // Timeout properties
  private timeoutId: any;
  private intervalId: any;
  private readonly TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  // Timer display properties
  remainingTime: number = 0; // in seconds
  timerDisplay: string = '10:00';

  // Vegaah online payment polling state
  isVegaahPolling = false;
  vegaahPollCountdown = 300; // 5 minutes in seconds
  vegaahCountdownDisplay = '05:00';
  vegaahPaymentSuccess = false;
  vegaahPaymentTimedOut = false;
  private vegaahWalletTxId: number | null = null;
  private vegaahPollSub: Subscription | null = null;
  private vegaahCountdownSub: Subscription | null = null;
  
  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private paymentService: PaymentService
  ) {}
  
  ngOnInit() {
    // Get amount from sessionStorage instead of query params
    this.loadAmountFromSession();
    
    // Load payment methods from database
    this.loadPaymentMethods();
    
    // Start the 10-minute timeout
    this.startTimeout();
  }
  
  ngOnDestroy() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.intervalId) clearInterval(this.intervalId);
    this.vegaahPollSub?.unsubscribe();
    this.vegaahCountdownSub?.unsubscribe();
  }
  
  private loadAmountFromSession() {
    const paymentData = sessionStorage.getItem('paymentAmount');
    if (paymentData) {
      try {
        const data = JSON.parse(paymentData);
        const currentTime = Date.now();
        const timeDiff = currentTime - data.timestamp;
        
        // Check if data is still valid (within 10 minutes)
        if (timeDiff < this.TIMEOUT_DURATION) {
          this.amount = data.amount;
          // Calculate remaining time in seconds
          this.remainingTime = Math.floor((this.TIMEOUT_DURATION - timeDiff) / 1000);
          this.updateTimerDisplay();
        } else {
          // Data expired, redirect to wallet
          this.redirectToWallet();
        }
      } catch (error) {
        console.error('Error parsing payment data from sessionStorage:', error);
        this.redirectToWallet();
      }
    } else {
      // No payment data found, redirect to wallet
      this.redirectToWallet();
    }
  }
  
  private startTimeout() {
    this.timeoutId = setTimeout(() => {
      this.redirectToWallet();
    }, this.TIMEOUT_DURATION);
    
    // Start countdown timer that updates every second
    this.startCountdownTimer();
  }
  
  private startCountdownTimer() {
    this.intervalId = setInterval(() => {
      this.remainingTime--;
      this.updateTimerDisplay();
      
      // If time runs out, redirect to wallet
      if (this.remainingTime <= 0) {
        this.redirectToWallet();
      }
    }, 1000);
  }
  
  private updateTimerDisplay() {
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = this.remainingTime % 60;
    this.timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  private redirectToWallet() {
    // Clear sessionStorage
    sessionStorage.removeItem('paymentAmount');
    // Redirect to wallet page
    this.router.navigate(['/wallet']);
  }
  
  loadPaymentMethods() {
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
      },
      error: (err) => {
        console.error('Failed to load payment methods', err);
        // Fallback to empty array if API fails
        this.paymentMethods = [];
      }
    });
  }
  
  selectPaymentMethod(method: string) {
    this.selectedPaymentMethod = method;
  }
  
  // Helper method to get payment method icon based on name
  getPaymentMethodIcon(methodName: string): string {
    const name = methodName.toLowerCase();
    if (name.includes('online') || name.includes('card')) return 'credit_card';
    if (name.includes('wire') || name.includes('transfer')) return 'account_balance';
    if (name.includes('cheque')) return 'receipt';
    if (name.includes('cash')) return 'payments';
    return 'payment'; // default icon
  }
  
  // Helper method to check if payment method allows file upload
  allowsFileUpload(method: any): boolean {
    return method.allow_file === 1;
  }
  
  // Helper method to check if payment method allows remarks
  allowsRemarks(method: any): boolean {
    return method.allow_remark === 1;
  }
  
  backToHome() {
    this.router.navigate(['/']);
  }
  
  addReceiptId() {
    if (this.receiptId && !this.receiptIds.includes(this.receiptId)) {
      this.receiptIds.push(this.receiptId);
      this.receiptId = '';
    }
  }
  
  removeReceiptId(id: string) {
    this.receiptIds = this.receiptIds.filter(receiptId => receiptId !== id);
  }
  
  addChequeNo() {
    if (this.chequeNo && !this.chequeNos.includes(this.chequeNo)) {
      this.chequeNos.push(this.chequeNo);
      this.chequeNo = '';
    }
  }
  
  removeChequeNo(no: string) {
    this.chequeNos = this.chequeNos.filter(chequeNo => chequeNo !== no);
  }
  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFile = input.files[0];
    }
  }
  
  payNow() {
    const selectedMethodObj = this.paymentMethods.find(method =>
      method.name.toLowerCase().replace(' ', '_') === this.selectedPaymentMethod
    );

    // Vegaah online payment — open in new tab, poll on current page
    if (selectedMethodObj?.id === 1 || selectedMethodObj?.name?.toLowerCase().includes('vegaah')) {
      this.paymentService.initiateVegaahTopUp(this.amount).subscribe({
        next: (res) => {
          this.vegaahWalletTxId = res.wallet_transaction_id;
          window.open(res.payment_url, '_blank');
          this.startVegaahPolling();
        },
        error: () => { alert('Failed to initiate payment. Please try again.'); }
      });
      return;
    }

    let finalRemarks = this.selectedPaymentMethod === 'cash' ? this.cashRemarks : this.remarks;

    this.paymentService.createPaymentTransaction(
      this.amount,
      1,
      finalRemarks,
      this.selectedFile || undefined,
      selectedMethodObj?.id
    ).subscribe({
      next: () => { this.router.navigate(['/wallet']); },
      error: () => { alert('Failed to add payment. Please try again.'); }
    });
  }

  private startVegaahPolling(): void {
    this.isVegaahPolling = true;
    this.vegaahPollCountdown = 300;
    this.updateVegaahCountdownDisplay();

    // Countdown every second
    this.vegaahCountdownSub = interval(1000).subscribe(() => {
      this.vegaahPollCountdown--;
      this.updateVegaahCountdownDisplay();
      if (this.vegaahPollCountdown <= 0) {
        this.vegaahCountdownSub?.unsubscribe();
        this.vegaahPollSub?.unsubscribe();
        this.vegaahPaymentTimedOut = true;
      }
    });

    // Poll every 4 seconds
    this.vegaahPollSub = interval(4000).subscribe(() => {
      if (!this.vegaahWalletTxId || this.vegaahPaymentTimedOut) return;
      this.paymentService.getWalletTxStatus(this.vegaahWalletTxId).subscribe({
        next: (res) => {
          if (res?.payment_status === 1) {
            this.vegaahPollSub?.unsubscribe();
            this.vegaahCountdownSub?.unsubscribe();
            this.vegaahPaymentSuccess = true;
            setTimeout(() => this.router.navigate(['/wallet']), 2000);
          }
        }
      });
    });
  }

  private updateVegaahCountdownDisplay(): void {
    const m = Math.floor(this.vegaahPollCountdown / 60).toString().padStart(2, '0');
    const s = (this.vegaahPollCountdown % 60).toString().padStart(2, '0');
    this.vegaahCountdownDisplay = `${m}:${s}`;
  }
}
