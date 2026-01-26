import {
  ChangeDetectorRef,
  Component,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NgIf, NgFor } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatStepper } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { AuthService } from '../../../../services/auth.service';
import { UserService } from '../../../../services/user.service';
import { TenantService } from '../../../../services/tenant.service';

@Component({
  selector: 'vex-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    NgIf,
    NgFor,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatAutocompleteModule,
    RouterLink,
    MatSnackBarModule,
    MatDividerModule,
    MatStepperModule,
    MatRadioModule
  ]
})
export class RegisterComponent implements AfterViewInit {
  form: UntypedFormGroup = this.fb.group({
    signatory: this.fb.group({
      userType: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      mobile: ['', Validators.required],
      whatsapp: [''],
      alternate: [''],
      email: ['', [Validators.required, Validators.email]],
      otpCode: ['']
    }),
    business: this.fb.group({
      agencyName: ['', Validators.required],
      businessType: ['', Validators.required],
      natureOfBusiness: ['', Validators.required],
      tdsExemption: ['NO'],
      tdsPercent: [''],
      tdsCertificate: [null],
      iataCode: [''],
      panNumber: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]
      ],
      uploadPan: [null, Validators.required],
      hasGst: [false],
      gstNumber: [''],
      uploadGstCertificate: [null]
    }),
    bank: this.fb.group({
      accountName: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.minLength(6)]],
      ifsc: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z]{4}0[0-9]{6}$/)]
      ],
      phone: ['']
    }),
    address: this.fb.group({
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      postalCode: ['', Validators.required],
      countryId: [null, Validators.required],
      state: ['', Validators.required],
      stateId: [null],
      city: ['', Validators.required],
      aadhaarNumber: [''],
      addressDocuments: ['', Validators.required],
      addressProofDocuments: [null, Validators.required],
      secondAddressDocuments: [''],
      secondAddressProofDocuments: [null]
    }),
    referral: this.fb.group({
      referredBy: ['', Validators.required],
      referralNameOrId: ['', Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    })
  });

  inputType = 'password';
  visible = false;
  emailVerified = false;
  otpSent = false;
  isSendingOtp = false;
  isVerifyingOtp = false;
  otpCooldown = 0;
  private otpTimerId: any = null;
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  filteredCountries: any[] = [];
  filteredStates: any[] = [];
  filteredCities: any[] = [];
  selectedCountryName = '';
  selectedStateName = '';
  isIndia = false;
  panVerified = false;
  isVerifyingPan = false;
  private panVerifyTimer?: any;
  gstVerified = false;
  isVerifyingGst = false;
  bankVerified = false;
  isVerifyingBank = false;
  aadhaarVerified = false;
  isVerifyingAadhaar = false;
  rid: string | null = null;
  minAllowedStepIndex = 0;
  configPanVerify = true;
  configGstVerify = true;
  configBankVerify = true;
  configAadhaarVerify = true;
  logoUrl: string = 'assets/img/logo/logo.svg';
  businessTypeOptions: string[] = [
    'Solo Propriter',
    'Partnership',
    'Private LTD',
    'Public LTD',
    'LLP'
  ];
  natureOfBusinessOptions: string[] = ['Travel Agency', 'Corporate', 'Other'];
  addressDocumentOptions: string[] = ['Lease Agreement', 'Utility Bill'];
  referredByOptions: string[] = ['Agent', 'Employee'];
  @ViewChild(MatStepper) stepper!: MatStepper;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: UntypedFormBuilder,
    private cd: ChangeDetectorRef,
    private snackbar: MatSnackBar,
    private auth: AuthService,
    private user: UserService,
    private tenantService: TenantService
  ) {}

  ngOnInit(): void {
    this.tenantService.getAppInfo().subscribe((info) => {
      if (info && info.logoUrl) {
        this.logoUrl = info.logoUrl;
        this.cd.detectChanges();
      }
    });
    this.auth.getRegisterDetail().subscribe({
      next: (res) => {
        const data = res || {};
        this.configPanVerify = data.pan_verify === true;
        this.configGstVerify = data.gst_verify === true;
        this.configBankVerify = data.bank_verify === true;
        this.configAadhaarVerify = data.aadhaar_verify === true;
        const bt =
          data.business_type || data.businessTypes || data.businessType;
        if (Array.isArray(bt) && bt.length) {
          this.businessTypeOptions = bt;
        }
        const nb =
          data.nature_of_business ||
          data.natureOfBusiness ||
          data.nature_of_businesses;
        if (Array.isArray(nb) && nb.length) {
          this.natureOfBusinessOptions = nb;
        }
        const ad =
          data.address_document ||
          data.address_documents ||
          data.addressDocuments;
        if (Array.isArray(ad) && ad.length) {
          this.addressDocumentOptions = ad;
        }
        const rb =
          data.referred_by ||
          data.referredBy ||
          data.referred ||
          data['Referred B'];
        if (Array.isArray(rb) && rb.length) {
          this.referredByOptions = rb;
        }
        if (!this.configPanVerify) {
          this.panVerified = true;
        }
        if (!this.configBankVerify) {
          this.bankVerified = true;
        }
      },
      error: () => {}
    });
    this.user.getPublicCountries().subscribe({
      next: (res) => {
        this.countries = Array.isArray(res) ? res : [];
        this.filteredCountries = this.countries.slice();
        const currentCountryId = this.form.get('address.countryId')?.value;
        if (currentCountryId !== null && currentCountryId !== undefined) {
          const currentCountry = this.countries.find(
            (c: any) => Number(c.id) === Number(currentCountryId)
          );
          this.selectedCountryName = currentCountry?.name || '';
        }
      },
      error: () => {
        this.countries = [];
        this.snackbar.open('Failed to load countries.', 'OK', {
          duration: 3000
        });
      }
    });
    const isVerified = localStorage.getItem('isVerifyEmail') === 'true';
    if (isVerified) {
      this.emailVerified = true;
      const raw = localStorage.getItem('registerSignatory');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const s = this.form.get('signatory') as UntypedFormGroup;
          s.patchValue(
            {
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              mobile: data.mobile || '',
              whatsapp: data.whatsapp || '',
              alternate: data.alternate || '',
              email: data.email || ''
            },
            { emitEvent: false }
          );
        } catch {}
      }
      this.form.get('business')?.enable({ emitEvent: false });
      this.form.get('address')?.enable({ emitEvent: false });
      this.otpSent = false;
    } else {
      this.form.get('business')?.disable({ emitEvent: false });
      this.form.get('address')?.disable({ emitEvent: false });
    }
    this.form.get('signatory.email')?.valueChanges.subscribe(() => {
      this.otpSent = false;
      this.emailVerified = false;
      this.isSendingOtp = false;
      this.isVerifyingOtp = false;
      this.form.get('signatory.otpCode')?.reset('');
      this.form.get('business')?.disable({ emitEvent: false });
      this.form.get('address')?.disable({ emitEvent: false });
      localStorage.setItem('isVerifyEmail', 'false');
    });
    this.form.get('signatory.otpCode')?.valueChanges.subscribe(() => {
      this.isVerifyingOtp = false;
    });

    this.form.get('address.countryId')?.valueChanges.subscribe((id) => {
      const selected = this.countries.find(
        (c: any) => Number(c.id) === Number(id)
      );
      this.selectedCountryName = selected?.name || '';
      this.isIndia =
        !!selected &&
        (selected.code === 'IN' ||
          (selected.name || '').toLowerCase() === 'india');
      const stateCtrl = this.form.get('address.state');
      const stateIdCtrl = this.form.get('address.stateId');
      if (this.isIndia) {
        this.user.getStatesByCountryPublic(Number(id)).subscribe({
          next: (res) => {
            this.states = Array.isArray(res) ? res : [];
            this.filteredStates = this.states.slice();
          }
        });
        stateCtrl?.clearValidators();
        stateCtrl?.setValue('');
        stateCtrl?.updateValueAndValidity();
        stateIdCtrl?.setValidators([Validators.required]);
        stateIdCtrl?.setValue(null);
        stateIdCtrl?.updateValueAndValidity();
      } else {
        this.states = [];
        this.filteredStates = [];
        stateIdCtrl?.clearValidators();
        stateIdCtrl?.setValue(null);
        stateIdCtrl?.updateValueAndValidity();
        stateCtrl?.setValidators([Validators.required]);
        stateCtrl?.updateValueAndValidity();
        this.selectedStateName = '';
        this.cities = [];
        this.filteredCities = [];
        this.form.get('address.city')?.setValue('');
      }
    });

    this.form.get('address.stateId')?.valueChanges.subscribe((stateId) => {
      const selectedState = this.states.find(
        (s: any) => Number(s.id) === Number(stateId)
      );
      this.selectedStateName = selectedState?.name || '';
      if (stateId) {
        this.user.getCitiesByStatePublic(Number(stateId)).subscribe({
          next: (res) => {
            const raw = res as any;
            this.cities = Array.isArray(raw)
              ? raw
              : raw && Array.isArray(raw.data)
                ? raw.data
                : [];
            this.filteredCities = this.cities.slice();
          },
          error: () => {
            this.cities = [];
            this.filteredCities = [];
          }
        });
      } else {
        this.cities = [];
        this.filteredCities = [];
        this.form.get('address.city')?.setValue('');
      }
    });

    this.form.get('business.panNumber')?.valueChanges.subscribe((val) => {
      if (!this.configPanVerify) {
        this.panVerified = true;
        this.isVerifyingPan = false;
        return;
      }
      const raw = (val || '').toString();
      const sanitized = raw.replace(/\s+/g, '').toUpperCase();
      if (sanitized !== raw) {
        this.form
          .get('business.panNumber')
          ?.setValue(sanitized, { emitEvent: false });
      }
      this.panVerified = false;
      if (this.panVerifyTimer) {
        clearTimeout(this.panVerifyTimer);
      }
      const validFormat = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(sanitized);
      if (!validFormat || sanitized.length !== 10) {
        this.isVerifyingPan = false;
        return;
      }
      const s = this.form.get('signatory') as UntypedFormGroup;
      const name =
        `${(s.get('firstName')?.value || '').toString().trim()} ${(s.get('lastName')?.value || '').toString().trim()}`.trim();
      this.isVerifyingPan = true;
      this.panVerifyTimer = setTimeout(() => {
        this.auth.verifyPan(sanitized, name).subscribe({
          next: (res) => {
            const ok = this.isPanResponseVerified(res);
            this.panVerified = !!ok;
            this.isVerifyingPan = false;
            if (!this.panVerified) {
              this.snackbar.open('PAN verification failed.', 'OK', {
                duration: 3000
              });
            }
          },
          error: () => {
            this.isVerifyingPan = false;
            this.panVerified = false;
            this.snackbar.open('PAN verification error.', 'OK', {
              duration: 3000
            });
          }
        });
      }, 300);
    });

    this.form.get('business.hasGst')?.valueChanges.subscribe((has) => {
      const ctrl = this.form.get('business.gstNumber');
      if (has) {
        ctrl?.setValidators([
          Validators.required,
          Validators.minLength(15),
          Validators.maxLength(15),
          Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/)
        ]);
      } else {
        ctrl?.clearValidators();
        this.gstVerified = false;
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });

    this.form.get('business.gstNumber')?.valueChanges.subscribe((val) => {
      const raw = (val || '').toString();
      const sanitized = raw.replace(/\s+/g, '').toUpperCase();
      if (sanitized !== raw) {
        this.form
          .get('business.gstNumber')
          ?.setValue(sanitized, { emitEvent: false });
      }
      this.gstVerified = false;
      this.isVerifyingGst = false;
    });
  }

  onCountryInput(value: string) {
    const val = (value || '').toString().toLowerCase();
    this.selectedCountryName = value || '';
    this.filteredCountries = this.countries.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      return name.includes(val) || code.includes(val);
    });
  }

  onCountrySelected(name: string) {
    const val = (name || '').toString().toLowerCase();
    const selected = this.countries.find(
      (c: any) => (c.name || '').toLowerCase() === val
    );
    const countryId = selected ? selected.id : null;
    this.selectedCountryName = selected?.name || name || '';
    this.form.get('address.countryId')?.setValue(countryId);
  }

  onStateInput(value: string) {
    const val = (value || '').toString().toLowerCase();
    this.selectedStateName = value || '';
    this.filteredStates = this.states.filter((s: any) => {
      const name = (s.name || '').toLowerCase();
      return name.includes(val);
    });
  }

  onStateSelected(name: string) {
    const val = (name || '').toString().toLowerCase();
    const selected = this.states.find(
      (s: any) => (s.name || '').toLowerCase() === val
    );
    const stateId = selected ? selected.id : null;
    this.selectedStateName = selected?.name || name || '';
    this.form.get('address.stateId')?.setValue(stateId);
  }

  onCityInput(value: string) {
    const val = (value || '').toString().toLowerCase();
    this.filteredCities = this.cities.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      return name.includes(val);
    });
  }

  ngAfterViewInit(): void {
    const ridParam = this.route.snapshot.queryParamMap.get('rid');
    if (!ridParam) {
      this.auth.registerStartDraft().subscribe({
        next: (res) => {
          this.rid = res?.uid || null;
          if (this.rid) {
            this.router.navigate([], {
              queryParams: { rid: this.rid },
              replaceUrl: true
            });
          }
        },
        error: () => {
          this.rid = null;
        }
      });
    } else {
      this.rid = ridParam;
      this.auth.registerDraftStatus(this.rid).subscribe({
        next: (res) => {
          if (res?.expired) {
            this.auth.registerStartDraft().subscribe({
              next: (r2) => {
                this.rid = r2?.uid || null;
                if (this.rid) {
                  this.router.navigate([], {
                    queryParams: { rid: this.rid },
                    replaceUrl: true
                  });
                }
                this.minAllowedStepIndex = 0;
                if (this.stepper) this.stepper.selectedIndex = 0;
              }
            });
            return;
          }
          const steps = res?.steps || {};
          const nextIdx = Number(res?.nextStepIndex ?? 0);
          const clampedIdx = Math.min(nextIdx, 4);
          this.minAllowedStepIndex = clampedIdx;
          if (this.stepper) this.stepper.selectedIndex = clampedIdx;
          this.emailVerified = !!steps.signatory;
          this.panVerified = !!steps.business;
          this.gstVerified = !!steps.gst;
          this.bankVerified = !!steps.bank;
          this.cd.detectChanges();
        },
        error: () => {
          // Ignore, keep default state
        }
      });
    }
  }

  register() {
    const s = this.form.get('signatory') as UntypedFormGroup;
    const b = this.form.get('business') as UntypedFormGroup;
    const bk = this.form.get('bank') as UntypedFormGroup;
    const a = this.form.get('address') as UntypedFormGroup;
    const r = this.form.get('referral') as UntypedFormGroup;

    const termsAccepted = r.get('termsAccepted')?.value === true;
    if (!termsAccepted) {
      this.snackbar.open('Please agree to the Terms & Conditions.', 'OK', {
        duration: 3000
      });
      return;
    }
    if (this.form.invalid) {
      this.snackbar.open('Please fill all required fields.', 'OK', {
        duration: 3000
      });
      return;
    }
    const hasGst = !!b.get('hasGst')?.value;
    if (
      (this.configPanVerify && !this.panVerified) ||
      (this.configGstVerify && hasGst && !this.gstVerified) ||
      (this.configBankVerify && !this.bankVerified)
    ) {
      this.snackbar.open(
        'Please complete all verifications before registering.',
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const fd = new FormData();
    fd.append('firstName', s.get('firstName')?.value || '');
    fd.append('lastName', s.get('lastName')?.value || '');
    fd.append('mobile', s.get('mobile')?.value || '');
    fd.append('whatsapp', s.get('whatsapp')?.value || '');
    fd.append('alternate', s.get('alternate')?.value || '');
    fd.append('email', s.get('email')?.value || '');

    fd.append('agencyName', b.get('agencyName')?.value || '');
    fd.append('businessType', b.get('businessType')?.value || '');
    fd.append('natureOfBusiness', b.get('natureOfBusiness')?.value || '');
    fd.append('tdsExemption', b.get('tdsExemption')?.value || '');
    fd.append('tdsPercent', b.get('tdsPercent')?.value || '');
    fd.append('iataCode', b.get('iataCode')?.value || '');
    fd.append('panNumber', b.get('panNumber')?.value || '');
    fd.append('gstNumber', b.get('gstNumber')?.value || '');

    fd.append('addressLine1', a.get('addressLine1')?.value || '');
    fd.append('addressLine2', a.get('addressLine2')?.value || '');
    fd.append('postalCode', a.get('postalCode')?.value || '');
    const countryId = a.get('countryId')?.value;
    const selectedCountry = this.countries.find(
      (c: any) => Number(c.id) === Number(countryId)
    );
    const countryName = selectedCountry?.name || '';
    fd.append('country', countryName);
    fd.append('country_id', String(countryId ?? ''));
    const isIndiaSelected =
      !!selectedCountry &&
      (selectedCountry.code === 'IN' ||
        (selectedCountry.name || '').toLowerCase() === 'india');
    const stateId = a.get('stateId')?.value;
    const stateName = isIndiaSelected
      ? this.states.find((s: any) => Number(s.id) === Number(stateId))?.name ||
        ''
      : a.get('state')?.value || '';
    fd.append('state', stateName);
    if (stateId !== null && stateId !== undefined && stateId !== '') {
      fd.append('state_id', String(stateId));
    }
    fd.append('city', a.get('city')?.value || '');
    fd.append('addressDocuments', a.get('addressDocuments')?.value || '');
    fd.append(
      'secondAddressDocuments',
      a.get('secondAddressDocuments')?.value || ''
    );

    fd.append('referredBy', r.get('referredBy')?.value || '');
    fd.append('referralNameOrId', r.get('referralNameOrId')?.value || '');

    const tdsCertificate = b.get('tdsCertificate')?.value;
    const uploadPan = b.get('uploadPan')?.value;
    const uploadGstCertificate = b.get('uploadGstCertificate')?.value;
    const addressProofDocuments = a.get('addressProofDocuments')?.value;
    const secondAddressProofDocuments = a.get(
      'secondAddressProofDocuments'
    )?.value;
    if (tdsCertificate) fd.append('tdsCertificate', tdsCertificate);
    if (uploadPan) fd.append('uploadPan', uploadPan);
    if (uploadGstCertificate)
      fd.append('uploadGstCertificate', uploadGstCertificate);
    if (addressProofDocuments)
      fd.append('addressProofDocuments', addressProofDocuments);
    if (secondAddressProofDocuments)
      fd.append('secondAddressProofDocuments', secondAddressProofDocuments);

    const draft = {
      signatory: {
        firstName: s.get('firstName')?.value || '',
        lastName: s.get('lastName')?.value || '',
        mobile: s.get('mobile')?.value || '',
        whatsapp: s.get('whatsapp')?.value || '',
        alternate: s.get('alternate')?.value || '',
        email: s.get('email')?.value || ''
      },
      business: {
        agencyName: b.get('agencyName')?.value || '',
        businessType: b.get('businessType')?.value || '',
        natureOfBusiness: b.get('natureOfBusiness')?.value || '',
        tdsExemption: b.get('tdsExemption')?.value || '',
        tdsPercent: b.get('tdsPercent')?.value || '',
        iataCode: b.get('iataCode')?.value || '',
        panNumber: b.get('panNumber')?.value || '',
        gstNumber: b.get('gstNumber')?.value || ''
      },
      address: {
        addressLine1: a.get('addressLine1')?.value || '',
        addressLine2: a.get('addressLine2')?.value || '',
        postalCode: a.get('postalCode')?.value || '',
        countryId: countryId ?? null,
        country: countryName,
        stateId: Number(countryId) === 4 ? stateId ?? null : null,
        state: stateName,
        city: a.get('city')?.value || '',
        addressDocuments: a.get('addressDocuments')?.value || '',
        secondAddressDocuments: a.get('secondAddressDocuments')?.value || ''
      },
      referral: {
        referredBy: r.get('referredBy')?.value || '',
        referralNameOrId: r.get('referralNameOrId')?.value || '',
        termsAccepted: termsAccepted
      },
      files: {
        tdsCertificate: tdsCertificate ? tdsCertificate.name : null,
        uploadPan: uploadPan ? uploadPan.name : null,
        uploadGstCertificate: uploadGstCertificate
          ? uploadGstCertificate.name
          : null,
        addressProofDocuments: addressProofDocuments
          ? addressProofDocuments.name
          : null,
        secondAddressProofDocuments: secondAddressProofDocuments
          ? secondAddressProofDocuments.name
          : null
      }
    };
    try {
      localStorage.setItem('registerFullDraft', JSON.stringify(draft));
    } catch {}

    this.auth.registerFull(fd).subscribe({
      next: () => {
        try {
          localStorage.removeItem('registerFullDraft');
          localStorage.removeItem('registerSignatory');
          localStorage.removeItem('isVerifyEmail');
        } catch {}
        this.snackbar.open(
          'Thank you for the registration. We will review your documents and get back to you.',
          'OK',
          { duration: 5000 }
        );
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.snackbar.open(err?.error?.message || 'Registration failed', 'OK', {
          duration: 3000
        });
      }
    });
  }

  sendOtp() {
    if (this.otpCooldown > 0) {
      return;
    }
    const emailCtrl = this.form.get('signatory.email');
    const email = emailCtrl?.value;
    if (!emailCtrl?.valid) {
      this.snackbar.open('Enter a valid email to send OTP.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.isSendingOtp = true;
    this.auth.sendEmailOtp(email).subscribe({
      next: () => {
        this.otpSent = true;
        this.snackbar.open('OTP sent to email.', 'OK', { duration: 3000 });
        this.startOtpCooldown();
      },
      error: (err) => {
        this.snackbar.open(err?.error?.message || 'Failed to send OTP', 'OK', {
          duration: 3000
        });
      },
      complete: () => {
        this.isSendingOtp = false;
      }
    });
  }

  private startOtpCooldown() {
    if (this.otpTimerId) {
      clearInterval(this.otpTimerId);
    }
    this.otpCooldown = 60;
    this.otpTimerId = setInterval(() => {
      if (this.otpCooldown > 0) {
        this.otpCooldown--;
      }
      if (this.otpCooldown <= 0 && this.otpTimerId) {
        clearInterval(this.otpTimerId);
        this.otpTimerId = null;
      }
    }, 1000);
  }

  verifyOtp() {
    const code = (this.form.get('signatory.otpCode')?.value || '')
      .toString()
      .trim();
    const email = this.form.get('signatory.email')?.value;
    if (!code) {
      this.snackbar.open('Enter OTP to verify email.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.isVerifyingOtp = true;
    this.auth.verifyEmailOtp(email, code).subscribe({
      next: () => {
        this.emailVerified = true;
        this.otpSent = false;
        this.form.get('signatory.otpCode')?.reset('');
        this.form.get('signatory.email')?.disable({ emitEvent: false });
        this.form.get('business')?.enable({ emitEvent: false });
        this.form.get('address')?.enable({ emitEvent: false });
        const s = this.form.get('signatory') as UntypedFormGroup;
        const data = {
          firstName: s.get('firstName')?.value || '',
          lastName: s.get('lastName')?.value || '',
          mobile: s.get('mobile')?.value || '',
          whatsapp: s.get('whatsapp')?.value || '',
          alternate: s.get('alternate')?.value || '',
          email: s.get('email')?.value || ''
        };
        localStorage.setItem('registerSignatory', JSON.stringify(data));
        localStorage.setItem('isVerifyEmail', 'true');
        this.snackbar.open(
          'Email verified. Business and Address enabled.',
          'OK',
          { duration: 3000 }
        );
      },
      error: (err) => {
        this.isVerifyingOtp = false;
        this.snackbar.open(
          err?.error?.message || 'Invalid or expired OTP',
          'OK',
          { duration: 3000 }
        );
      },
      complete: () => {
        this.isVerifyingOtp = false;
      }
    });
  }

  verifyGst() {
    const b = this.form.get('business') as UntypedFormGroup;
    const hasGst = !!b.get('hasGst')?.value;
    const gstin = (b.get('gstNumber')?.value || '').toString().trim();
    const agencyName = (b.get('agencyName')?.value || '').toString().trim();
    if (!hasGst || !this.configGstVerify) {
      this.gstVerified = false;
      return;
    }
    if (!gstin || !agencyName) {
      this.snackbar.open('Enter GST and agency name to verify.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.isVerifyingGst = true;
    this.auth.verifyGst(gstin, agencyName).subscribe({
      next: (res) => {
        this.gstVerified = this.isPanResponseVerified(res);
        if (!this.gstVerified) {
          this.snackbar.open('GST verification failed.', 'OK', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.gstVerified = false;
        this.snackbar.open('GST verification error.', 'OK', { duration: 3000 });
      },
      complete: () => {
        this.isVerifyingGst = false;
      }
    });
  }

  verifyBank() {
    if (!this.configBankVerify) {
      this.bankVerified = true;
      this.isVerifyingBank = false;
      return;
    }

    const bk = this.form.get('bank') as UntypedFormGroup;
    const payload = {
      bank_account: (bk.get('accountNumber')?.value || '').toString().trim(),
      ifsc: (bk.get('ifsc')?.value || '').toString().trim(),
      name: (bk.get('accountName')?.value || '').toString().trim(),
      phone: (bk.get('phone')?.value || '').toString().trim() || undefined,
      user_id: 'register'
    };
    if (!payload.bank_account || !payload.ifsc || !payload.name) {
      this.snackbar.open('Enter bank details to verify.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.isVerifyingBank = true;
    this.auth.verifyBank(payload).subscribe({
      next: (res) => {
        this.bankVerified = this.isPanResponseVerified(res);
        if (!this.bankVerified) {
          this.snackbar.open('Bank verification failed.', 'OK', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.bankVerified = false;
        this.snackbar.open('Bank verification error.', 'OK', {
          duration: 3000
        });
      },
      complete: () => {
        this.isVerifyingBank = false;
      }
    });
  }

  verifyAadhaar() {
    if (!this.configAadhaarVerify) {
      this.aadhaarVerified = false;
      this.isVerifyingAadhaar = false;
      return;
    }
    const a = this.form.get('address') as UntypedFormGroup;
    const aadhaar = (a.get('aadhaarNumber')?.value || '').toString();
    if (!/^\d{12}$/.test(aadhaar)) {
      this.snackbar.open('Enter a valid 12-digit Aadhaar.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.isVerifyingAadhaar = true;
    this.auth.verifyAadhaar(aadhaar).subscribe({
      next: (res) => {
        this.aadhaarVerified = this.isPanResponseVerified(res);
        if (!this.aadhaarVerified) {
          this.snackbar.open('Aadhaar verification failed.', 'OK', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.aadhaarVerified = false;
        this.snackbar.open('Aadhaar verification error.', 'OK', {
          duration: 3000
        });
      },
      complete: () => {
        this.isVerifyingAadhaar = false;
      }
    });
  }

  onFileChange(controlPath: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.form.get(controlPath)?.setValue(file);
  }

  toggleVisibility() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visible = true;
      this.cd.markForCheck();
    }
  }

  private isPanResponseVerified(res: any): boolean {
    if (!res) return false;
    const obj = res?.data ?? res;
    if (obj.valid === true || obj.is_valid === true) return true;
    const status = (obj.status || obj.Status || '').toString().toUpperCase();
    if (
      status === 'SUCCESS' ||
      status === 'VERIFIED' ||
      status === 'OK' ||
      status === 'VALID'
    )
      return true;
    const code = Number(obj.code || obj.status_code || obj.statusCode || 0);
    if (code === 200) return true;
    const resultStr =
      typeof obj.result === 'string' ? obj.result.toUpperCase() : '';
    if (resultStr === 'VALID') return true;
    const accStatus = (obj.account_status || obj.accountStatus || '')
      .toString()
      .toUpperCase();
    if (accStatus === 'VALID') return true;
    const accCode = (obj.account_status_code || obj.accountStatusCode || '')
      .toString()
      .toUpperCase();
    if (accCode === 'ACCOUNT_IS_VALID') return true;
    return false;
  }

  reverifyPan() {
    const rawPan = (this.form.get('business.panNumber')?.value || '')
      .toString()
      .trim()
      .toUpperCase();
    const validFormat = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(rawPan);
    if (!validFormat) {
      this.snackbar.open('Enter a valid PAN to verify.', 'OK', {
        duration: 3000
      });
      return;
    }
    const s = this.form.get('signatory') as UntypedFormGroup;
    const name =
      `${(s.get('firstName')?.value || '').toString().trim()} ${(s.get('lastName')?.value || '').toString().trim()}`.trim();
    this.isVerifyingPan = true;
    this.auth.verifyPan(rawPan, name).subscribe({
      next: (res) => {
        const ok = this.isPanResponseVerified(res);
        this.panVerified = !!ok;
        if (!this.panVerified) {
          this.snackbar.open('PAN verification failed.', 'OK', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.panVerified = false;
        this.snackbar.open('PAN verification error.', 'OK', { duration: 3000 });
      },
      complete: () => {
        this.isVerifyingPan = false;
      }
    });
  }

  saveSignatoryStep(stepper: MatStepper) {
    const s = this.form.get('signatory') as UntypedFormGroup;
    const payload = {
      uid: this.rid || '',
      type: s.get('userType')?.value || '',
      firstName: s.get('firstName')?.value || '',
      lastName: s.get('lastName')?.value || '',
      mobile: s.get('mobile')?.value || '',
      whatsapp: s.get('whatsapp')?.value || '',
      alternate: s.get('alternate')?.value || '',
      email: s.get('email')?.value || '',
      emailVerified: this.emailVerified
    };
    if (
      !this.emailVerified ||
      (this.form.get('signatory') as UntypedFormGroup).invalid
    ) {
      this.snackbar.open('Complete signatory details and verify email.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.auth.registerStepSignatory(payload).subscribe({
      next: () => {
        stepper.next();
      },
      error: (err) => {
        this.snackbar.open(
          err?.error?.message || 'Failed to save signatory step',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  saveBusinessStep(stepper: MatStepper) {
    const b = this.form.get('business') as UntypedFormGroup;
    if (b.invalid || (this.configPanVerify && !this.panVerified)) {
      this.snackbar.open('Complete business details and verify PAN.', 'OK', {
        duration: 3000
      });
      return;
    }
    const fd = new FormData();
    fd.append('uid', this.rid || '');
    fd.append(
      'email',
      (this.form.get('signatory.email')?.value || '').toString()
    );
    fd.append('agencyName', b.get('agencyName')?.value || '');
    fd.append('businessType', b.get('businessType')?.value || '');
    fd.append('natureOfBusiness', b.get('natureOfBusiness')?.value || '');
    fd.append('tdsExemption', b.get('tdsExemption')?.value || '');
    fd.append('tdsPercent', b.get('tdsPercent')?.value || '');
    fd.append('iataCode', b.get('iataCode')?.value || '');
    fd.append('panNumber', b.get('panNumber')?.value || '');
    fd.append('panVerified', this.panVerified ? '1' : '0');
    const tdsCertificate = b.get('tdsCertificate')?.value;
    const uploadPan = b.get('uploadPan')?.value;
    if (tdsCertificate) fd.append('tdsCertificate', tdsCertificate);
    if (uploadPan) fd.append('uploadPan', uploadPan);
    this.auth.registerStepBusiness(fd).subscribe({
      next: () => {
        stepper.next();
      },
      error: (err) => {
        this.snackbar.open(
          err?.error?.message || 'Failed to save business step',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  saveGstStep(stepper: MatStepper) {
    const b = this.form.get('business') as UntypedFormGroup;
    const hasGst = !!b.get('hasGst')?.value;
    const fd = new FormData();
    fd.append('uid', this.rid || '');
    fd.append(
      'email',
      (this.form.get('signatory.email')?.value || '').toString()
    );
    fd.append('hasGst', hasGst ? '1' : '0');
    fd.append('gstNumber', b.get('gstNumber')?.value || '');
    fd.append('gstVerified', this.gstVerified ? '1' : '0');
    const uploadGstCertificate = b.get('uploadGstCertificate')?.value;
    if (uploadGstCertificate)
      fd.append('uploadGstCertificate', uploadGstCertificate);
    if (this.configGstVerify && hasGst && !this.gstVerified) {
      this.snackbar.open('Verify GST before proceeding.', 'OK', {
        duration: 3000
      });
      return;
    }
    this.auth.registerStepGst(fd).subscribe({
      next: () => {
        stepper.next();
      },
      error: (err) => {
        this.snackbar.open(
          err?.error?.message || 'Failed to save GST step',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  saveBankStep(stepper: MatStepper) {
    const bk = this.form.get('bank') as UntypedFormGroup;
    if (bk.invalid || (this.configBankVerify && !this.bankVerified)) {
      this.snackbar.open('Complete bank details and verify account.', 'OK', {
        duration: 3000
      });
      return;
    }
    const payload = {
      uid: this.rid || '',
      email: (this.form.get('signatory.email')?.value || '').toString(),
      accountName: bk.get('accountName')?.value || '',
      accountNumber: bk.get('accountNumber')?.value || '',
      ifsc: bk.get('ifsc')?.value || '',
      phone: bk.get('phone')?.value || '',
      bankVerified: this.bankVerified
    };
    this.auth.registerStepBank(payload).subscribe({
      next: () => {
        stepper.next();
      },
      error: (err) => {
        this.snackbar.open(
          err?.error?.message || 'Failed to save bank step',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  saveAddressReferralStep(stepper?: MatStepper) {
    const a = this.form.get('address') as UntypedFormGroup;
    const r = this.form.get('referral') as UntypedFormGroup;
    if (a.invalid || r.invalid) {
      this.snackbar.open('Complete address and referral details.', 'OK', {
        duration: 3000
      });
      return;
    }
    const fd = new FormData();
    fd.append('uid', this.rid || '');
    fd.append(
      'email',
      (this.form.get('signatory.email')?.value || '').toString()
    );
    fd.append('addressLine1', a.get('addressLine1')?.value || '');
    fd.append('addressLine2', a.get('addressLine2')?.value || '');
    fd.append('postalCode', a.get('postalCode')?.value || '');
    const countryId = a.get('countryId')?.value;
    fd.append('country_id', String(countryId ?? ''));
    const stateId = a.get('stateId')?.value;
    const stateName = a.get('state')?.value || '';
    if (stateId !== null && stateId !== undefined && stateId !== '') {
      fd.append('state_id', String(stateId));
    }
    fd.append('state', stateName);
    fd.append('city', a.get('city')?.value || '');
    const aadhaar = (a.get('aadhaarNumber')?.value || '').toString();
    if (aadhaar) fd.append('aadhaar', aadhaar);
    fd.append('aadhaarVerified', this.aadhaarVerified ? '1' : '0');
    fd.append('addressDocuments', a.get('addressDocuments')?.value || '');
    fd.append(
      'secondAddressDocuments',
      a.get('secondAddressDocuments')?.value || ''
    );
    fd.append('referredBy', r.get('referredBy')?.value || '');
    fd.append('referralNameOrId', r.get('referralNameOrId')?.value || '');
    const addressProofDocuments = a.get('addressProofDocuments')?.value;
    const secondAddressProofDocuments = a.get(
      'secondAddressProofDocuments'
    )?.value;
    if (addressProofDocuments)
      fd.append('addressProofDocuments', addressProofDocuments);
    if (secondAddressProofDocuments)
      fd.append('secondAddressProofDocuments', secondAddressProofDocuments);
    this.auth.registerStepAddressReferral(fd).subscribe({
      next: () => {
        if (stepper) stepper.next();
      },
      error: (err) => {
        this.snackbar.open(
          err?.error?.message || 'Failed to save address/referral step',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  completeRegistration() {
    const s = this.form.get('signatory') as UntypedFormGroup;
    const b = this.form.get('business') as UntypedFormGroup;
    const bk = this.form.get('bank') as UntypedFormGroup;
    const a = this.form.get('address') as UntypedFormGroup;
    const r = this.form.get('referral') as UntypedFormGroup;

    const termsAccepted = r.get('termsAccepted')?.value === true;
    if (!termsAccepted) {
      this.snackbar.open('Please agree to the Terms & Conditions.', 'OK', {
        duration: 3000
      });
      return;
    }
    if (this.form.invalid) {
      this.snackbar.open('Please fill all required fields.', 'OK', {
        duration: 3000
      });
      return;
    }
    const hasGst = !!b.get('hasGst')?.value;
    if (
      (this.configPanVerify && !this.panVerified) ||
      (this.configGstVerify && hasGst && !this.gstVerified) ||
      (this.configBankVerify && !this.bankVerified)
    ) {
      this.snackbar.open(
        'Please complete all verifications before registering.',
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const fd = new FormData();
    fd.append('uid', this.rid || '');
    fd.append('email', s.get('email')?.value || '');
    fd.append('addressLine1', a.get('addressLine1')?.value || '');
    fd.append('addressLine2', a.get('addressLine2')?.value || '');
    fd.append('postalCode', a.get('postalCode')?.value || '');
    const countryId = a.get('countryId')?.value;
    fd.append('country_id', String(countryId ?? ''));
    const stateId = a.get('stateId')?.value;
    const stateName = a.get('state')?.value || '';
    if (stateId !== null && stateId !== undefined && stateId !== '') {
      fd.append('state_id', String(stateId));
    }
    fd.append('state', stateName);
    fd.append('city', a.get('city')?.value || '');
    const aadhaar = (a.get('aadhaarNumber')?.value || '').toString();
    if (aadhaar) fd.append('aadhaar', aadhaar);
    fd.append('aadhaarVerified', this.aadhaarVerified ? '1' : '0');
    fd.append('addressDocuments', a.get('addressDocuments')?.value || '');
    fd.append(
      'secondAddressDocuments',
      a.get('secondAddressDocuments')?.value || ''
    );
    fd.append('referredBy', r.get('referredBy')?.value || '');
    fd.append('referralNameOrId', r.get('referralNameOrId')?.value || '');
    const addressProofDocuments = a.get('addressProofDocuments')?.value;
    const secondAddressProofDocuments = a.get(
      'secondAddressProofDocuments'
    )?.value;
    if (addressProofDocuments)
      fd.append('addressProofDocuments', addressProofDocuments);
    if (secondAddressProofDocuments)
      fd.append('secondAddressProofDocuments', secondAddressProofDocuments);

    this.auth.registerStepAddressReferral(fd).subscribe({
      next: () => {
        const uid = this.rid || '';
        if (uid) {
          this.auth.registerStepsCompleteUid(uid).subscribe({
            next: () => {
              try {
                localStorage.removeItem('registerFullDraft');
                localStorage.removeItem('registerSignatory');
                localStorage.removeItem('isVerifyEmail');
              } catch {}
              this.snackbar.open(
                'Registration submitted. Please wait for activation.',
                'OK',
                { duration: 3000 }
              );
              this.router.navigate(['/login']);
            },
            error: (err) => {
              this.snackbar.open(
                err?.error?.message || 'Registration failed',
                'OK',
                { duration: 3000 }
              );
            }
          });
        } else {
          const email = s.get('email')?.value || '';
          this.auth.registerStepsComplete(email).subscribe({
            next: () => {
              try {
                localStorage.removeItem('registerFullDraft');
                localStorage.removeItem('registerSignatory');
                localStorage.removeItem('isVerifyEmail');
              } catch {}
              this.snackbar.open(
                'Registration submitted. Please wait for activation.',
                'OK',
                { duration: 3000 }
              );
              this.router.navigate(['/login']);
            },
            error: (err) => {
              this.snackbar.open(
                err?.error?.message || 'Registration failed',
                'OK',
                { duration: 3000 }
              );
            }
          });
        }
      },
      error: (err) => {
        this.snackbar.open(
          err?.error?.message || 'Failed to save address/referral step',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }
}
