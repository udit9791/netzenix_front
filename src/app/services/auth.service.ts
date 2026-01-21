import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/login
      `,
      data
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {});
  }

  me(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  getPermissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions`);
  }

  changePassword(data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile/change-password`, {
      current_password: data.current_password,
      new_password: data.new_password,
      new_password_confirmation: data.confirm_password // 👈 Laravel expects this
    });
  }

  sendEmailOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/email-otp`, { email });
  }

  verifyEmailOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/email-otp/verify`, {
      email,
      otp
    });
  }

  registerFull(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/full`, formData);
  }

  verifyPan(pan: string, name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pan-verification`, { pan, name });
  }

  verifyGst(gstin: string, business_name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-gst`, {
      gstin,
      business_name
    });
  }

  verifyBank(payload: {
    bank_account: string;
    ifsc: string;
    name: string;
    phone?: string;
    user_id?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-bank`, payload);
  }

  verifyAadhaar(aadhaar: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-aadhaar`, { aadhaar });
  }

  registerStepSignatory(data: {
    uid?: string;
    type: string;
    firstName: string;
    lastName: string;
    mobile: string;
    whatsapp?: string;
    alternate?: string;
    email: string;
    emailVerified: boolean;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/signatory`, data);
  }

  registerStepBusiness(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/business`, formData);
  }

  registerStepGst(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/gst`, formData);
  }

  registerStepBank(data: {
    email: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    phone?: string;
    bankVerified: boolean;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/bank`, data);
  }

  registerStepAddressReferral(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/register/steps/address-referral`,
      formData
    );
  }

  registerStepOther(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/other`, formData);
  }

  registerStepsComplete(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/complete`, { email });
  }

  registerStepsCompleteUid(uid: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/complete`, { uid });
  }

  registerStartDraft(): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/steps/start`, {});
  }

  registerDraftStatus(uid: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/register/steps/status/${uid}`);
  }
}
