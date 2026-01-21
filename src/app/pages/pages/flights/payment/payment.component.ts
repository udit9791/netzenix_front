import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WalletService } from '../../../../services/wallet.service';
import { SpecialFlightService } from '../../../../services/special-flight.service';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

interface WalletResponse {
  success: boolean;
  data: {
    balance: number;
    currency: string;
    credit_limit: number;
    credit_balance: number;
    is_active: boolean;
  };
}

interface BookingDetailsResponse {
  status: boolean;
  message: string;
  data: any;
}

@Component({
  selector: 'vex-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, FormsModule]
})
export class PaymentComponent implements OnInit, OnDestroy {
  // Order related properties
  orderId: string = '';
  amount: number = 0;
  convenienceFee: number = 0;
  totalAmount: number = 0;
  // Hold/Status
  bookingStatus: number = 0;
  holdAmount: number = 0;

  // Convenience fee breakdown
  convenienceFeeBaseAmount: number = 0;
  convenienceFeeCGST: number = 0;
  convenienceFeeSGST: number = 0;

  // Tax related properties
  serviceFeecgst: number = 0;
  serviceFeesgst: number = 0;
  serviceFeeigst: number = 0;
  commission: number = 0;
  tdsonCommission: number = 0;

  // Payment method related properties
  selectedPaymentMethod: string = '';
  paymentMethods = [
    { id: 'pay_online', name: 'Pay Online' },
    { id: 'deposit_wallet', name: 'Deposit Wallet' }
  ];

  // Timer related properties
  timerSubscription: Subscription | null = null;
  timerDisplay: string = '15:00';

  // Booking related properties
  bookingId: string = '';
  bookingDetails: any = null;

  // User related properties
  userId: number = 0;
  isSameState: boolean = false;

  // Wallet related properties
  walletBalance: number = 0;
  creditBalance: number = 0;
  totalAvailableBalance: number = 0;
  hasEnoughBalance: boolean = false;

  // File upload related properties
  selectedFile: File | null = null;

  // Payment processing status
  isProcessing: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService,
    private specialFlightService: SpecialFlightService
  ) {}

  ngOnInit(): void {
    // Get user ID from localStorage
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        this.userId = userData.id || 0;
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    }

    this.route.params.subscribe((params) => {
      this.bookingId = params['id'];
      this.fetchBookingDetails();
    });

    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  fetchBookingDetails(): void {
    if (!this.bookingId) {
      console.error('Booking ID is missing');
      return;
    }

    this.specialFlightService
      .getBookingDetails(Number(this.bookingId))
      .subscribe(
        (response: BookingDetailsResponse) => {
          console.log(response);
          if (response.status) {
            this.bookingDetails = response.data;
            console.log('Booking details received:', this.bookingDetails);

            // Set values directly from API response
            this.orderId = this.bookingDetails.id || `ORD-${Date.now()}`;
            this.amount = this.bookingDetails.total_amount || 0;
            this.convenienceFee = this.bookingDetails.service_fee || 0;
            this.commission = this.bookingDetails.commission || 0;
            this.tdsonCommission = this.bookingDetails.tds_on_commission || 0;

            // Hold and status
            this.bookingStatus = Number(this.bookingDetails.status || 0);
            this.holdAmount = Number(this.bookingDetails.hold_amount || 0);

            // Use hold_amount as total when status is 9 (hold booking)
            // For status 8 (hold confirmed), subtract hold_amount from final_total
            if (this.bookingStatus === 9 && this.holdAmount > 0) {
              this.totalAmount = this.holdAmount;
            } else if (this.bookingStatus === 8 && this.holdAmount > 0) {
              this.totalAmount =
                (this.bookingDetails.final_total || 0) - this.holdAmount;
            } else {
              this.totalAmount = this.bookingDetails.final_total || 0;
            }

            // Set tax values based on IGST or CGST/SGST
            if (this.bookingDetails.igst) {
              this.serviceFeeigst = this.bookingDetails.igst || 0;
              this.serviceFeecgst = 0;
              this.serviceFeesgst = 0;
              this.isSameState = false;
            } else {
              this.serviceFeeigst = 0;
              this.serviceFeecgst = this.bookingDetails.cgst || 0;
              this.serviceFeesgst = this.bookingDetails.sgst || 0;
              this.isSameState = true;
            }

            // Fetch wallet balance
            this.fetchWalletBalance();
          } else {
            console.error('Failed to fetch booking details:', response.message);
          }
        },
        (error: Error) => {
          console.error('Error fetching booking details:', error);
        }
      );
  }

  fetchWalletBalance(): void {
    this.walletService.getWalletBalance().subscribe(
      (response: WalletResponse) => {
        if (response.success) {
          this.walletBalance = response.data.balance;
          this.creditBalance = response.data.credit_balance;
          // Only add positive wallet balance to credit balance
          this.totalAvailableBalance =
            (this.walletBalance > 0 ? this.walletBalance : 0) +
            this.creditBalance;
          this.checkWalletBalance();
        } else {
          console.error('Failed to fetch wallet balance');
        }
      },
      (error) => {
        console.error('Error fetching wallet balance:', error);
      }
    );
  }

  checkWalletBalance(): void {
    this.hasEnoughBalance = this.totalAvailableBalance >= this.totalAmount;
  }

  getCurrentUserId(): number {
    const userDataStr = localStorage.getItem('user');
    console.log('User data from localStorage:', userDataStr);

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        console.log('Parsed user data:', userData);

        if (userData && userData.id) {
          return Number(userData.id);
        } else {
          console.error('User ID not found in userData object:', userData);
          // Try to get user ID from auth service or other sources if available
          // For now, we'll check if there's a user_id property instead
          return Number(userData.user_id || 0);
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
    } else {
      console.error('No userData found in localStorage');
    }
    return 0;
  }

  // All calculations are now handled by the backend API

  startTimer(): void {
    // Set timer for 15 minutes
    const timerDuration = 15 * 60; // 15 minutes in seconds
    let remainingTime = timerDuration;

    this.timerSubscription = interval(1000)
      .pipe(take(timerDuration + 1))
      .subscribe(() => {
        remainingTime -= 1;

        if (remainingTime <= 0) {
          // Timer expired, redirect to home
          this.backToHome();
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
          }
        } else {
          // Update timer display
          const minutes = Math.floor(remainingTime / 60);
          const seconds = remainingTime % 60;
          this.timerDisplay = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
      });
  }

  selectPaymentMethod(method: string): void {
    this.selectedPaymentMethod = method;
  }

  selectDepositWallet(): void {
    this.selectedPaymentMethod = 'deposit_wallet';
    this.checkWalletBalance();
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  processPayment(): void {
    if (this.isProcessing) {
      return; // Prevent multiple submissions
    }

    this.isProcessing = true;

    if (this.selectedPaymentMethod === 'deposit_wallet') {
      this.submitWalletPayment();
    } else if (this.selectedPaymentMethod === 'pay_online') {
      this.submitOnlinePayment();
    } else {
      console.error('Invalid payment method selected');
      this.isProcessing = false;
    }
  }

  submitWalletPayment(): void {
    if (!this.hasEnoughBalance) {
      alert('Insufficient balance in your wallet');
      this.isProcessing = false;
      return;
    }

    const paymentData = {
      booking_id: this.bookingId,
      amount: this.totalAmount,
      payment_method: 'wallet'
    };

    this.specialFlightService.processPayment(paymentData).subscribe(
      (response: any) => {
        this.isProcessing = false;
        this.handlePaymentResponse(response);
      },
      (error: Error) => {
        console.error('Error processing wallet payment:', error);
        this.isProcessing = false;
        alert('Payment failed. Please try again.');
      }
    );
  }

  submitOnlinePayment(): void {
    // Implement online payment gateway integration here
    const paymentData = {
      booking_id: this.bookingId,
      amount: this.totalAmount,
      payment_method: 'online'
    };

    this.specialFlightService.processPayment(paymentData).subscribe(
      (response: any) => {
        this.isProcessing = false;
        this.handlePaymentResponse(response);
      },
      (error: Error) => {
        console.error('Error processing online payment:', error);
        this.isProcessing = false;
        alert('Payment failed. Please try again.');
      }
    );
  }

  handlePaymentResponse(response: any): void {
    if (response.status) {
      // Update wallet balance if payment was from wallet
      if (this.selectedPaymentMethod === 'deposit_wallet') {
        this.walletBalance -= this.totalAmount;
      }
      // Redirect to confirmation page or provided URL
      if (response.data) {
        this.router.navigate(['/flights/payment-confirmation', this.bookingId]);
      }
    } else {
      alert(`Payment failed: ${response.message}`);
    }
  }

  backToHome() {
    this.router.navigate(['/dashboard']);
  }
}
