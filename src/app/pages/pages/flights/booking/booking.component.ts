import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-flight-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatIconModule
  ],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss']
})
export class BookingComponent {
  travelerForm = new FormGroup({
    title: new FormControl('Mr', Validators.required),
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required)
  });

  contactForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    agentRef: new FormControl('')
  });

  couponCode = new FormControl('');

  // sample booking / flight data (replace with real)
  booking = {
    totalPrice: 2500,
    travelDate: new Date(2025, 8, 17),
    adults: 1,
    children: 0,
    cabin: 'Economy',
    checkin: '15 KG',
    flight: {
      airline: 'Akasa Air',
      flightNo: 'QP-1102',
      from: 'Ahmedabad',
      to: 'Mumbai',
      departTime: '10:00',
      arriveTime: '11:30',
      date: new Date(2025, 8, 17),
      duration: '1h 30m',
      logo: 'https://picsum.photos/seed/akasa/80'
    }
  };

  applyCoupon() {
    const code = this.couponCode.value;
    if (!code) {
      alert('Please enter a promo code');
      return;
    }
    // demo: apply a flat 10% discount for code 'DISCOUNT10'
    if (code.toUpperCase() === 'DISCOUNT10') {
      this.booking.totalPrice = Math.round(this.booking.totalPrice * 0.9);
      alert('Coupon applied: 10% off');
    } else {
      alert('Invalid coupon code');
    }
  }

  proceedToPayment() {
    // Validate forms
    if (this.travelerForm.invalid || this.contactForm.invalid) {
      this.travelerForm.markAllAsTouched();
      this.contactForm.markAllAsTouched();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // stub: save booking and navigate to payment flow
    console.log('Proceeding with booking', {
      traveler: this.travelerForm.value,
      contact: this.contactForm.value,
      booking: this.booking
    });
    alert('Proceed to payment — implement payment flow here');
  }
}
