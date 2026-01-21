import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators
} from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HotelService } from '../../../../services/hotel.service';
import { HotelOptionService } from 'src/app/services/hotel-option.service';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vex-add-hotel',
  templateUrl: './add-hotel.component.html',
  styleUrls: ['./add-hotel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    MatSnackBarModule
  ]
})
export class AddHotelComponent {
  selectedIndex = 0;
  hotelForm: FormGroup;
  currentYear = new Date().getFullYear();
  years = Array.from({ length: 50 }, (_, i) => this.currentYear - i);
  addMode = true;
  step1Completed = false;
  saving = false;
  hotelId: number | null = null;
  addressAutocomplete: any = null;
  addressAutocompleteInitialized = false;
  placeAutocompleteEl: any = null;
  countries: any[] = [];
  states: any[] = [];
  selectedCountryId: number | null = null;
  selectedStateId: number | null = null;
  cities: any[] = [];
  selectedCityId: number | null = null;
  amenityOptions: any[] = [];
  roomAmenityOptions: any[] = [];
  mealOptions: any[] = [];
  bedTypes: any[] = [];
  roomTypes: any[] = [];
  roomViews: any[] = [];
  photoFiles: File[] = [];
  videoFiles: File[] = [];
  photoTypes: number[] = [];
  photoTypeOptions: { id: number; name: string }[] = [];
  currentUploadTypeId: number | null = null;
  categorySelectedNames: { [id: number]: string[] } = {};
  roomPhotoFiles: { [roomId: number]: File[] } = {};
  roomSelectedNames: { [roomId: number]: string[] } = {};
  roomPhotoFilesByIndex: { [index: number]: File[] } = {};
  roomSelectedNamesByIndex: { [index: number]: string[] } = {};
  roomExistingPhotos: { [roomId: number]: any[] } = {};
  uploadingRoomId: number | null = null;
  uploading = false;
  timeOptions: string[] = [];
  imgBaseUrl: string = environment.imgUrl;

  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;

  get rooms(): FormArray {
    return this.hotelForm.get('rooms') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private hotelService: HotelService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private optionService: HotelOptionService
  ) {
    this.hotelForm = this.fb.group({
      basic: this.fb.group({
        name: ['', Validators.required],
        rating: [null, Validators.required],
        builtYear: [null, Validators.required],
        channelManager: ['yes'],
        managerName: ['']
      }),
      location: this.fb.group({
        address: [''],
        city: [''],
        state: [''],
        country: [''],
        pincode: [''],
        latitude: [''],
        longitude: ['']
      }),
      amenities: this.fb.group({
        wifi: [false],
        parking: [false],
        pool: [false],
        gym: [false],
        spa: [false],
        restaurant: [false],
        selected: this.fb.array([])
      }),
      rooms: this.fb.array([]),
      media: this.fb.group({
        photos: [''],
        videos: ['']
      }),
      policies: this.fb.group({
        checkIn: [''],
        checkOut: [''],
        cancellation: [''],
        childPolicy: [''],
        tbaDetail: ['']
      })
    });
    this.addRoom();
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        this.timeOptions.push(`${hh}:${mm}`);
      }
    }
    if (!this.timeOptions.includes('23:59')) {
      this.timeOptions.push('23:59');
    }
  }

  private toHHMM(t: any): string {
    const s = String(t || '').trim();
    if (!s) return '';
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return '';
    const h = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${h}:${mm}`;
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const idParam = params['id'] ?? params['hotelId'] ?? null;
      const idNum = idParam ? Number(idParam) : null;
      if (idNum && !isNaN(idNum)) {
        this.hotelId = idNum;
        this.addMode = false;
        this.step1Completed = true;
        this.hotelService.getHotelById(this.hotelId).subscribe({
          next: (res: any) => {
            const payload = res?.data || res;
            const hotelData = payload?.hotel ?? payload;
            const locPatch: any = {
              address: hotelData?.address || '',
              pincode: hotelData?.pincode || '',
              latitude: hotelData?.latitude ?? '',
              longitude: hotelData?.longitude ?? '',
              country: hotelData?.country_name || '',
              state: hotelData?.state_name || '',
              city: hotelData?.city_name || ''
            };
            this.hotelForm.patchValue({
              basic: {
                name: hotelData?.name || '',
                rating: hotelData?.star_rating || null,
                builtYear: hotelData?.built_year || null,
                channelManager: hotelData?.channel_manager || 'yes',
                managerName: hotelData?.manager_name || ''
              },
              location: {
                address: locPatch.address,
                country: locPatch.country,
                state: locPatch.state,
                city: locPatch.city,
                pincode: locPatch.pincode,
                latitude: locPatch.latitude,
                longitude: locPatch.longitude
              }
            });

            const pol = this.hotelForm.get('policies') as FormGroup;
            pol.patchValue({
              checkIn: this.toHHMM(hotelData?.policy_check_in) || '',
              checkOut: this.toHHMM(hotelData?.policy_check_out) || '',
              cancellation: hotelData?.policy_cancellation || '',
              childPolicy: hotelData?.policy_child || ''
            });

            const mediaGroup = this.hotelForm.get('media') as FormGroup;
            const photos = Array.isArray(payload?.photos) ? payload.photos : [];
            const videos = Array.isArray(payload?.videos) ? payload.videos : [];
            mediaGroup.patchValue({ photos, videos });

            const roomsData = Array.isArray(payload?.rooms)
              ? payload.rooms
              : [];
            const roomAmenityPrefill: string[][] = [];
            while (this.rooms.length > 0) this.rooms.removeAt(0);
            roomsData.forEach((r: any) => {
              const grp = this.fb.group({
                roomId: [r?.id ?? null],
                roomName: [r?.room_name || ''],
                roomDescription: [r?.room_description || ''],
                availableRooms: [r?.available_rooms ?? ''],
                maxAdult: [r?.max_adult ?? ''],
                maxInfant: [r?.max_infant ?? ''],
                maxChild: [r?.max_child ?? ''],
                maxOccupancy: [r?.max_occupancy ?? ''],
                mealOption: [
                  r?.meal_option?.id ? Number(r.meal_option.id) : ''
                ],
                roomType: [r?.room_type?.id ? Number(r.room_type.id) : ''],
                bedType: [r?.bed_type?.id ? Number(r.bed_type.id) : ''],
                roomSize: this.fb.group({
                  value: [r?.room_size_value ?? ''],
                  unit: [r?.room_size_unit || 'sqft']
                }),
                roomView: [r?.room_view?.id ? Number(r.room_view.id) : ''],
                smokingAllowed: [r?.smoking_allowed ? 'yes' : 'no'],
                roomAmenities: this.fb.group({
                  wifi: [false],
                  ac: [false],
                  tv: [false],
                  minibar: [false],
                  balcony: [false],
                  kettle: [false],
                  toiletries: [false],
                  safe: [false],
                  desk: [false],
                  selected: this.fb.array([])
                }),
                pricing: this.fb.group({
                  baseRate: [r?.base_rate ?? ''],
                  extraAdultCharge: [r?.extra_adult_charge ?? ''],
                  childCharge: [r?.child_charge ?? '']
                })
              });
              this.rooms.push(grp);
              const rid = r?.id ? Number(r.id) : null;
              if (rid && !isNaN(rid)) {
                this.roomExistingPhotos[rid] = Array.isArray(r?.photos)
                  ? r.photos
                  : [];
              }
              const names: string[] = Array.isArray(r?.amenities)
                ? r.amenities
                : [];
              const arr = grp.get('roomAmenities.selected') as FormArray;
              if (
                names.length &&
                Array.isArray(this.roomAmenityOptions) &&
                this.roomAmenityOptions.length
              ) {
                const ids = names
                  .map((nm) => {
                    const found = this.roomAmenityOptions.find(
                      (opt: any) =>
                        String(opt.name).toLowerCase() ===
                        String(nm).toLowerCase()
                    );
                    return found ? found.id : null;
                  })
                  .filter((x) => x !== null);
                ids.forEach((id: any) => arr.push(this.fb.control(id)));
              } else if (names.length) {
                roomAmenityPrefill.push(names);
              }
            });
            if (roomAmenityPrefill.length) {
              (window as any).__ROOM_EDIT_PREFILL_AMENITIES =
                roomAmenityPrefill;
            }

            const hotelAmenityNames: string[] = Array.isArray(
              payload?.amenities
            )
              ? payload.amenities
              : [];
            if (
              hotelAmenityNames.length &&
              Array.isArray(this.amenityOptions) &&
              this.amenityOptions.length
            ) {
              const arr = this.selectedAmenities;
              while (arr.length > 0) arr.removeAt(0);
              const ids = hotelAmenityNames
                .map((nm) => {
                  const found = this.amenityOptions.find(
                    (opt: any) =>
                      String(opt.name).toLowerCase() ===
                      String(nm).toLowerCase()
                  );
                  return found ? found.id : null;
                })
                .filter((x) => x !== null);
              ids.forEach((id: any) => arr.push(this.fb.control(id)));
            } else if (hotelAmenityNames.length) {
              (window as any).__HOTEL_EDIT_PREFILL_AMENITIES =
                hotelAmenityNames;
            }

            this.selectedCountryId = hotelData?.country
              ? Number(hotelData.country)
              : null;
            this.selectedStateId = hotelData?.state
              ? Number(hotelData.state)
              : null;
            this.selectedCityId = hotelData?.city
              ? Number(hotelData.city)
              : null;

            if (this.selectedCountryId) {
              this.userService.getCountries().subscribe({
                next: (response) => {
                  this.countries = Array.isArray(response)
                    ? response
                    : response?.data
                      ? response.data
                      : [];
                  const countryObj = this.countries.find(
                    (c: any) => Number(c.id) === Number(this.selectedCountryId)
                  );
                  const loc = this.hotelForm.get('location') as FormGroup;
                  if (countryObj) {
                    loc.patchValue({ country: countryObj.name || '' });
                  }
                  if (this.selectedCountryId) {
                    this.userService
                      .getStatesByCountry(this.selectedCountryId)
                      .subscribe({
                        next: (statesRes) => {
                          this.states = Array.isArray(statesRes)
                            ? statesRes
                            : statesRes?.data
                              ? statesRes.data
                              : [];
                          const stateObj = this.states.find(
                            (s: any) =>
                              Number(s.id) === Number(this.selectedStateId)
                          );
                          if (stateObj) {
                            loc.patchValue({ state: stateObj.name || '' });
                          }
                          if (this.selectedStateId) {
                            this.userService
                              .getCitiesByState(this.selectedStateId)
                              .subscribe({
                                next: (citiesRes) => {
                                  this.cities = Array.isArray(citiesRes)
                                    ? citiesRes
                                    : citiesRes?.data
                                      ? citiesRes.data
                                      : [];
                                  const cityObj = this.cities.find(
                                    (ci: any) =>
                                      Number(ci.id) ===
                                      Number(this.selectedCityId)
                                  );
                                  if (cityObj) {
                                    loc.patchValue({
                                      city: cityObj.name || ''
                                    });
                                  }
                                },
                                error: () => {}
                              });
                          }
                        },
                        error: () => {}
                      });
                  }
                },
                error: () => {}
              });
            }

            this.initPlacesAutocomplete();
          },
          error: (err: any) => {
            this.snackBar.open('Failed to load hotel details', 'Close', {
              duration: 3000
            });
            console.error('Failed to fetch hotel details', err);
          }
        });
      }

      const urlKey = params['gmapsKey'] ?? null;
      if (urlKey) {
        (window as any).GMAPS_API_KEY = String(urlKey);
        try {
          localStorage.setItem('GMAPS_API_KEY', String(urlKey));
        } catch {}
        console.log('Google Maps API key set from URL param');
      } else {
        try {
          const storedKey = localStorage.getItem('GMAPS_API_KEY');
          if (storedKey) {
            (window as any).GMAPS_API_KEY = storedKey;
            console.log('Google Maps API key loaded from localStorage');
          }
        } catch {}
      }
    });
    this.ensurePlacesLibrary()
      .then(() => {
        console.log('Preloaded Google Places library');
      })
      .catch(() => {});

    this.userService.getCountries().subscribe({
      next: (response) => {
        this.countries = Array.isArray(response)
          ? response
          : response?.data
            ? response.data
            : [];
        const loc = this.hotelForm.get('location') as FormGroup;
        const cn = (loc.get('country')?.value || '').toString().trim();
        if (cn) {
          const found = this.countries.find(
            (c: any) => String(c.name).toLowerCase() === cn.toLowerCase()
          );
          if (found) {
            this.selectedCountryId = found.id;
            this.onCountryChange(found.id);
          }
        }
      },
      error: (err) => {
        console.error('Failed to load countries', err);
      }
    });

    this.hotelService.getAmenities('hotel').subscribe({
      next: (res) => {
        this.amenityOptions = Array.isArray(res)
          ? res
          : res?.data
            ? res.data
            : [];
        const arr = this.selectedAmenities;
        if (arr && arr.length === 0) {
          const namesSrc =
            typeof (window as any).__HOTEL_EDIT_PREFILL_AMENITIES !==
            'undefined'
              ? (window as any).__HOTEL_EDIT_PREFILL_AMENITIES
              : [];
          if (Array.isArray(namesSrc) && namesSrc.length) {
            const ids = namesSrc
              .map((nm: any) => {
                const found = this.amenityOptions.find(
                  (opt: any) =>
                    String(opt.name).toLowerCase() === String(nm).toLowerCase()
                );
                return found ? found.id : null;
              })
              .filter((x: any) => x !== null);
            ids.forEach((id: any) => arr.push(this.fb.control(id)));
          }
        }
      },
      error: () => {}
    });

    this.hotelService.getAmenities('room').subscribe({
      next: (res) => {
        this.roomAmenityOptions = Array.isArray(res)
          ? res
          : res?.data
            ? res.data
            : [];
        const namesSrc =
          typeof (window as any).__ROOM_EDIT_PREFILL_AMENITIES !== 'undefined'
            ? (window as any).__ROOM_EDIT_PREFILL_AMENITIES
            : [];
        if (Array.isArray(namesSrc) && namesSrc.length && this.rooms?.length) {
          namesSrc.forEach((names: any, idx: number) => {
            const arr = (this.rooms.at(idx) as FormGroup).get(
              'roomAmenities.selected'
            ) as FormArray;
            if (arr && arr.length === 0) {
              const ids = (Array.isArray(names) ? names : [])
                .map((nm: any) => {
                  const found = this.roomAmenityOptions.find(
                    (opt: any) =>
                      String(opt.name).toLowerCase() ===
                      String(nm).toLowerCase()
                  );
                  return found ? found.id : null;
                })
                .filter((x: any) => x !== null);
              ids.forEach((id: any) => arr.push(this.fb.control(id)));
            }
          });
        }
      },
      error: () => {}
    });

    this.optionService.getActiveOptions('meal_option').subscribe({
      next: (res) => {
        this.mealOptions = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
    this.optionService.getActiveOptions('bed_type').subscribe({
      next: (res) => {
        this.bedTypes = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
    this.optionService.getActiveOptions('room_type').subscribe({
      next: (res) => {
        this.roomTypes = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });
    this.optionService.getActiveOptions('room_view').subscribe({
      next: (res) => {
        this.roomViews = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {}
    });

    this.hotelService.getPhotoTypes().subscribe({
      next: (res) => {
        const arr = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        this.photoTypeOptions = arr;
      },
      error: () => {}
    });
  }

  addRoom() {
    this.rooms.push(
      this.fb.group({
        roomId: [null],
        roomName: [''],
        roomDescription: [''],
        availableRooms: [''],
        maxAdult: [''],
        maxInfant: [''],
        maxChild: [''],
        maxOccupancy: [''],
        mealOption: [''],
        roomType: [''],
        bedType: [''],
        roomSize: this.fb.group({ value: [''], unit: ['sqft'] }),
        roomView: [''],
        smokingAllowed: ['no'],
        roomAmenities: this.fb.group({
          wifi: [false],
          ac: [false],
          tv: [false],
          minibar: [false],
          balcony: [false],
          kettle: [false],
          toiletries: [false],
          safe: [false],
          desk: [false],
          selected: this.fb.array([])
        }),
        pricing: this.fb.group({
          baseRate: [''],
          extraAdultCharge: [''],
          childCharge: ['']
        })
      })
    );
  }

  removeRoom(index: number) {
    this.rooms.removeAt(index);
  }

  get selectedAmenities(): FormArray {
    return this.hotelForm.get('amenities.selected') as FormArray;
  }

  isAmenitySelected(id: number): boolean {
    return this.selectedAmenities.value.includes(id);
  }

  onAmenityToggle(id: number, checked: boolean): void {
    const arr = this.selectedAmenities;
    const idx = arr.value.indexOf(id);
    if (checked && idx === -1) {
      arr.push(this.fb.control(id));
    } else if (!checked && idx > -1) {
      arr.removeAt(idx);
    }
  }

  getRoomSelectedAmenities(index: number): FormArray {
    return (this.rooms.at(index) as FormGroup).get(
      'roomAmenities.selected'
    ) as FormArray;
  }

  isRoomAmenitySelected(index: number, id: number): boolean {
    return this.getRoomSelectedAmenities(index).value.includes(id);
  }

  onRoomAmenityToggle(index: number, id: number, checked: boolean): void {
    const arr = this.getRoomSelectedAmenities(index);
    const idx = arr.value.indexOf(id);
    if (checked && idx === -1) {
      arr.push(this.fb.control(id));
    } else if (!checked && idx > -1) {
      arr.removeAt(idx);
    }
  }

  nextTab() {
    if (this.addMode && !this.step1Completed) {
      return;
    }
    if (this.selectedIndex < 5) this.selectedIndex++;
  }

  prevTab() {
    if (this.selectedIndex > 0) this.selectedIndex--;
  }

  get basicForm(): FormGroup {
    return this.hotelForm.get('basic') as FormGroup;
  }

  onTabChange(index: number): void {
    if (this.addMode && !this.step1Completed && index !== 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = index;
  }

  saveStep1(): void {
    if (this.basicForm.invalid) {
      this.basicForm.markAllAsTouched();
      return;
    }
    const { name, rating, builtYear } = this.basicForm.value;
    const payload: any = {
      name,
      star_rating: rating,
      built_year: builtYear
    };
    if (this.hotelId) {
      payload.hotel_id = this.hotelId;
    }
    this.saving = true;
    this.hotelService.createHotelBasic(payload).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.hotelId = data?.id || data?.hotel?.id || data?.hotel_id || null;
        this.step1Completed = true;
        this.addMode = false;
        this.saving = false;
        this.snackBar.open('Step 1 saved. Continue with Location.', 'Close', {
          duration: 3000
        });
        if (this.hotelId) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { id: this.hotelId },
            queryParamsHandling: 'merge'
          });
        }
        this.selectedIndex = 1;
      },
      error: (err: any) => {
        this.saving = false;
        this.snackBar.open('Failed to save Step 1', 'Close', {
          duration: 3000
        });
        console.error(err);
      }
    });
  }

  saveAllDetails(): void {
    if (!this.hotelId) return;
    const payload = {
      hotel_id: this.hotelId,
      basic: (this.hotelForm.get('basic') as FormGroup).value,
      location: (this.hotelForm.get('location') as FormGroup).value,
      amenities: (this.hotelForm.get('amenities') as FormGroup).value,
      rooms: this.rooms.value,
      media: (this.hotelForm.get('media') as FormGroup).value,
      policies: (this.hotelForm.get('policies') as FormGroup).value
    };
    this.hotelService.saveAllDetails(payload).subscribe({
      next: () => {
        this.snackBar.open('Policies saved', 'Close', { duration: 2000 });
        this.router.navigate(['/sale/hotels']);
      },
      error: () => {
        this.snackBar.open('Failed to save', 'Close', { duration: 3000 });
      }
    });
  }

  saveRooms(): void {
    if (!this.hotelId) return;
    const roomsRaw: any[] = this.rooms.value || [];
    const rooms = roomsRaw.map((r) => {
      const id = r?.roomId ?? r?.id ?? null;
      return id ? { ...r, id } : r;
    });
    const payload = {
      hotel_id: this.hotelId,
      rooms
    };
    this.hotelService.saveRooms(payload, this.roomPhotoFilesByIndex).subscribe({
      next: () => {
        this.snackBar.open('Rooms saved', 'Close', { duration: 2000 });
        this.roomPhotoFilesByIndex = {};
        this.roomSelectedNamesByIndex = {};
        this.nextTab();
      },
      error: () => {
        this.snackBar.open('Failed to save rooms', 'Close', { duration: 3000 });
      }
    });
  }

  preventDefault(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onMixedSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const photos: File[] = [];
    const videos: File[] = [];
    files.forEach((f) => {
      if (f.type.startsWith('image/')) {
        photos.push(f);
      } else if (f.type.startsWith('video/')) {
        videos.push(f);
      }
    });
    this.videoFiles = [...this.videoFiles, ...videos];
    if (this.currentUploadTypeId) {
      photos.forEach((f) => {
        this.photoFiles.push(f);
        this.photoTypes.push(Number(this.currentUploadTypeId));
      });
    } else {
      const startLen = this.photoFiles.length;
      photos.forEach((f, idx) => {
        this.photoFiles.push(f);
        this.photoTypes.push(idx === 0 && startLen === 0 ? 1 : 9);
      });
    }
  }

  onMixedDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer?.files || []);
    const photos: File[] = [];
    const videos: File[] = [];
    files.forEach((f) => {
      if (f.type.startsWith('image/')) {
        photos.push(f);
      } else if (f.type.startsWith('video/')) {
        videos.push(f);
      }
    });
    this.videoFiles = [...this.videoFiles, ...videos];
    if (this.currentUploadTypeId) {
      photos.forEach((f) => {
        this.photoFiles.push(f);
        this.photoTypes.push(Number(this.currentUploadTypeId));
      });
    } else {
      const startLen = this.photoFiles.length;
      photos.forEach((f, idx) => {
        this.photoFiles.push(f);
        this.photoTypes.push(idx === 0 && startLen === 0 ? 1 : 9);
      });
    }
  }

  onCategoryPhotosSelected(typeId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const photos = files.filter((f) => f.type.startsWith('image/'));
    photos.forEach((f) => {
      this.photoFiles.push(f);
      this.photoTypes.push(Number(typeId));
    });
    this.categorySelectedNames[Number(typeId)] = photos.map((f) => f.name);
  }

  get selectedUploadFiles(): File[] {
    return [...(this.photoFiles || []), ...(this.videoFiles || [])];
  }

  get mediaPhotos(): any[] {
    const v = (this.hotelForm.get('media') as FormGroup)?.value || {};
    return Array.isArray(v?.photos) ? v.photos : [];
  }

  fullMediaUrl(item: any): string {
    const base = this.imgBaseUrl || '';
    if (!item) return '';
    const path =
      typeof item === 'string'
        ? item
        : item?.url ??
          item?.path ??
          item?.file_path ??
          item?.storage_path ??
          '';
    if (!path) return '';
    const abs = /^https?:\/\//i.test(path) || /^blob:|^data:/i.test(path);
    if (abs) return path;
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${b}/${p}`;
  }

  hasPhotosOfType(typeId: number): boolean {
    const tid = Number(typeId);
    const list = this.mediaPhotos || [];
    for (const p of list) {
      const cat = Number(p?.category_id ?? 9);
      if (cat === tid) return true;
    }
    return false;
  }

  photosOfType(typeId: number): any[] {
    const tid = Number(typeId);
    const list = this.mediaPhotos || [];
    return list.filter((p) => Number(p?.category_id ?? 9) === tid);
  }

  onCategoryDrop(typeId: number, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer?.files || []);
    const photos = files.filter((f) => f.type.startsWith('image/'));
    photos.forEach((f) => {
      this.photoFiles.push(f);
      this.photoTypes.push(Number(typeId));
    });
    this.categorySelectedNames[Number(typeId)] = photos.map((f) => f.name);
  }

  getRoomId(index: number): number | null {
    const grp = this.rooms.at(index) as FormGroup;
    const v = grp?.get('roomId')?.value;
    const idNum = v !== undefined && v !== null ? Number(v) : null;
    return idNum && !isNaN(idNum) ? idNum : null;
  }

  onRoomPhotosSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const photos = files.filter((f) => f.type.startsWith('image/'));
    const existingByIndex = this.roomPhotoFilesByIndex[index] || [];
    this.roomPhotoFilesByIndex[index] = [...existingByIndex, ...photos];
    this.roomSelectedNamesByIndex[index] = (
      this.roomSelectedNamesByIndex[index] || []
    ).concat(photos.map((f) => f.name));
    const rid = this.getRoomId(index);
    if (this.hotelId && rid) {
      const existingById = this.roomPhotoFiles[rid] || [];
      this.roomPhotoFiles[rid] = [...existingById, ...photos];
      this.roomSelectedNames[rid] = (this.roomSelectedNames[rid] || []).concat(
        photos.map((f) => f.name)
      );
    }
  }

  onRoomDrop(index: number, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer?.files || []);
    const photos = files.filter((f) => f.type.startsWith('image/'));
    const existingByIndex = this.roomPhotoFilesByIndex[index] || [];
    this.roomPhotoFilesByIndex[index] = [...existingByIndex, ...photos];
    this.roomSelectedNamesByIndex[index] = (
      this.roomSelectedNamesByIndex[index] || []
    ).concat(photos.map((f) => f.name));
    const rid = this.getRoomId(index);
    if (this.hotelId && rid) {
      const existingById = this.roomPhotoFiles[rid] || [];
      this.roomPhotoFiles[rid] = [...existingById, ...photos];
      this.roomSelectedNames[rid] = (this.roomSelectedNames[rid] || []).concat(
        photos.map((f) => f.name)
      );
    }
  }

  uploadRoomPhotos(index: number): void {
    const rid = this.getRoomId(index);
    if (!this.hotelId || !rid) return;
    const files = this.roomPhotoFiles[rid] || [];
    if (!files.length) return;
    this.uploadingRoomId = rid;
    const types = files.map(() => 2);
    const roomIds = files.map(() => rid);
    this.hotelService
      .uploadHotelMedia(this.hotelId, files, [], types, roomIds)
      .subscribe({
        next: (res) => {
          const data = res?.data || res;
          const mediaGroup = this.hotelForm.get('media') as FormGroup;
          const photos = Array.isArray(data?.photos) ? data.photos : [];
          const current = mediaGroup.value || {};
          const mergedPhotos = [
            ...(Array.isArray(current.photos) ? current.photos : []),
            ...photos
          ];
          mediaGroup.patchValue({ photos: mergedPhotos });
          this.roomPhotoFiles[rid] = [];
          this.roomSelectedNames[rid] = [];
          this.uploadingRoomId = null;
          this.snackBar.open('Room photos uploaded', 'Close', {
            duration: 2000
          });
        },
        error: () => {
          this.uploadingRoomId = null;
          this.snackBar.open('Failed to upload room photos', 'Close', {
            duration: 3000
          });
        }
      });
  }

  getRoomSelectedCount(index: number): number {
    const rid = this.getRoomId(index);
    const byIdx = this.roomSelectedNamesByIndex[index] || [];
    const byId = rid !== null ? this.roomSelectedNames[rid] || [] : [];
    return (
      (Array.isArray(byIdx) ? byIdx.length : 0) +
      (Array.isArray(byId) ? byId.length : 0)
    );
  }

  getRoomExistingPhotos(index: number): any[] {
    const rid = this.getRoomId(index);
    if (rid === null) return [];
    const arr = this.roomExistingPhotos[rid] || [];
    return Array.isArray(arr) ? arr : [];
  }

  deletePhoto(p: any): void {
    if (!this.hotelId) return;
    const rawUrl = typeof p === 'string' ? p : p?.url ?? p?.path ?? '';
    if (!rawUrl) return;
    const mediaGroup = this.hotelForm.get('media') as FormGroup;
    const current = this.mediaPhotos;
    this.hotelService
      .deleteHotelMedia(this.hotelId, rawUrl, 'photo')
      .subscribe({
        next: (res) => {
          const photosFiltered = (Array.isArray(current) ? current : []).filter(
            (u: any) => (typeof u === 'string' ? u : u?.url) !== rawUrl
          );
          mediaGroup.patchValue({ photos: photosFiltered });
          Object.keys(this.roomExistingPhotos).forEach((k) => {
            const rid = Number(k);
            const arr = this.roomExistingPhotos[rid] || [];
            this.roomExistingPhotos[rid] = (
              Array.isArray(arr) ? arr : []
            ).filter(
              (x: any) => (typeof x === 'string' ? x : x?.url) !== rawUrl
            );
          });
          this.snackBar.open('Photo deleted', 'Close', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Failed to delete photo', 'Close', {
            duration: 3000
          });
        }
      });
  }

  deleteRoomPhoto(roomId: number | null, p: any): void {
    if (!this.hotelId || !roomId) return;
    const rawUrl = typeof p === 'string' ? p : p?.url ?? p?.path ?? '';
    if (!rawUrl) return;
    this.hotelService
      .deleteHotelMedia(this.hotelId, rawUrl, 'photo')
      .subscribe({
        next: () => {
          const existing = this.roomExistingPhotos[roomId] || [];
          const filtered = (Array.isArray(existing) ? existing : []).filter(
            (x: any) => (typeof x === 'string' ? x : x?.url) !== rawUrl
          );
          this.roomExistingPhotos[roomId] = filtered;
          this.snackBar.open('Room photo deleted', 'Close', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Failed to delete room photo', 'Close', {
            duration: 3000
          });
        }
      });
  }

  uploadMedia(): void {
    if (!this.hotelId) return;
    this.uploading = true;
    this.hotelService
      .uploadHotelMedia(
        this.hotelId,
        this.photoFiles,
        this.videoFiles,
        this.photoTypes
      )
      .subscribe({
        next: (res) => {
          const data = res?.data || res;
          const mediaGroup = this.hotelForm.get('media') as FormGroup;
          const photos = Array.isArray(data?.photos) ? data.photos : [];
          const videos = Array.isArray(data?.videos) ? data.videos : [];
          const current = mediaGroup.value || {};
          const mergedPhotos = [
            ...(Array.isArray(current.photos) ? current.photos : []),
            ...photos
          ];
          const mergedVideos = [
            ...(Array.isArray(current.videos) ? current.videos : []),
            ...videos
          ];
          mediaGroup.patchValue({ photos: mergedPhotos, videos: mergedVideos });
          this.photoFiles = [];
          this.videoFiles = [];
          this.photoTypes = [];
          this.categorySelectedNames = {};
          this.uploading = false;
          this.snackBar.open('Media uploaded', 'Close', { duration: 2000 });
        },
        error: () => {
          this.uploading = false;
          this.snackBar.open('Failed to upload media', 'Close', {
            duration: 3000
          });
        }
      });
  }

  uploadAndContinue(): void {
    if (!this.hotelId) return;
    const hasFiles = (this.selectedUploadFiles?.length || 0) > 0;
    if (hasFiles) {
      this.uploading = true;
      this.hotelService
        .uploadHotelMedia(
          this.hotelId,
          this.photoFiles,
          this.videoFiles,
          this.photoTypes
        )
        .subscribe({
          next: () => {
            this.photoFiles = [];
            this.videoFiles = [];
            this.photoTypes = [];
            this.uploading = false;
            this.nextTab();
          },
          error: () => {
            this.uploading = false;
          }
        });
    } else {
      this.nextTab();
    }
  }

  saveLocation(): void {
    if (!this.hotelId) return;
    const loc = (this.hotelForm.get('location') as FormGroup).value;
    const payload = {
      hotel_id: this.hotelId,
      location: {
        ...loc,
        country_id: this.selectedCountryId,
        state_id: this.selectedStateId,
        city_id: this.selectedCityId
      }
    };
    this.hotelService.saveLocation(payload).subscribe({
      next: () => {
        this.snackBar.open('Location saved', 'Close', { duration: 2000 });
        this.nextTab();
      },
      error: () => {
        this.snackBar.open('Failed to save location', 'Close', {
          duration: 3000
        });
      }
    });
  }

  saveAmenities(): void {
    if (!this.hotelId) return;
    const ids: number[] =
      (this.hotelForm.get('amenities.selected') as FormArray).value || [];
    const payload = {
      hotel_id: this.hotelId,
      amenities: ids,
      type: 'hotel'
    };
    this.hotelService.saveAmenities(payload).subscribe({
      next: () => {
        this.snackBar.open('Amenities saved', 'Close', { duration: 2000 });
        this.nextTab();
      },
      error: () => {
        this.snackBar.open('Failed to save amenities', 'Close', {
          duration: 3000
        });
      }
    });
  }

  initPlacesAutocomplete(): void {
    if (this.addressAutocompleteInitialized) return;
    const inputEl = this.addressInput?.nativeElement;
    if (!inputEl) return;
    this.ensurePlacesLibrary()
      .then(() => {
        const g = (window as any).google;
        if (!g || !g.maps || !g.maps.places) return;
        this.addressAutocomplete = new g.maps.places.Autocomplete(inputEl, {
          fields: ['address_components', 'geometry', 'formatted_address'],
          types: ['geocode']
        });
        this.addressAutocomplete.addListener('place_changed', () => {
          const place = this.addressAutocomplete.getPlace();
          const loc = this.hotelForm.get('location') as FormGroup;
          const comps = place?.address_components || [];
          const find = (t: string) => {
            const c = comps.find(
              (x: any) => Array.isArray(x.types) && x.types.includes(t)
            );
            return c ? c.long_name : '';
          };
          const lat = place?.geometry?.location?.lat
            ? place.geometry.location.lat()
            : '';
          const lng = place?.geometry?.location?.lng
            ? place.geometry.location.lng()
            : '';
          loc.patchValue({
            address: place?.formatted_address || inputEl.value || '',
            city: find('locality'),
            state: find('administrative_area_level_1'),
            country: find('country'),
            pincode: find('postal_code'),
            latitude: lat,
            longitude: lng
          });
          this.autoSelectCountryStateCity();
        });
        this.addressAutocompleteInitialized = true;
      })
      .catch(() => {});
  }

  ensurePlacesLibrary(): Promise<void> {
    return new Promise((resolve, reject) => {
      const g = (window as any).google;
      if (g && g.maps && g.maps.places) {
        console.log('Google Places already available');
        resolve();
        return;
      }
      const key =
        (window as any).GMAPS_API_KEY ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('GMAPS_API_KEY')
          : null) ||
        environment.googleMapsApiKey;
      if (!key) {
        console.error('Google Maps API key not set');
        reject('Google Maps API key not set');
        return;
      }
      const existing = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      );
      if (existing) {
        console.log(
          'Found existing Google Maps script tag, waiting for Places'
        );
        const check = () => {
          const gx = (window as any).google;
          if (gx && gx.maps && gx.maps.places) resolve();
          else setTimeout(check, 100);
        };
        check();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        reject('Failed to load Google Maps');
      };
      document.head.appendChild(script);
      console.log('Appending Google Maps script tag', script.src);
    });
  }

  onAddressFocus(): void {
    this.initPlacesAutocomplete();
  }

  onAddressInput(event: Event): void {
    const v = (event.target as HTMLInputElement)?.value || '';
    if (v.length >= 3) {
      console.log('Address input length >= 3, initializing Places');
      this.initPlacesAutocomplete();
    } else {
      console.log('Address input length < 3, skipping Places init');
    }
  }

  onCountryChange(countryId: number): void {
    this.selectedCountryId = countryId || null;
    const country = this.countries.find((c: any) => c.id === countryId);
    const loc = this.hotelForm.get('location') as FormGroup;
    loc.patchValue({
      country: country ? country.name : ''
    });
    this.states = [];
    loc.patchValue({ state: '' });
    if (countryId) {
      this.userService.getStatesByCountry(countryId).subscribe({
        next: (response) => {
          this.states = Array.isArray(response)
            ? response
            : response?.data
              ? response.data
              : [];
          const sn = (loc.get('state')?.value || '').toString().trim();
          if (sn) {
            const sf = this.states.find(
              (s: any) => String(s.name).toLowerCase() === sn.toLowerCase()
            );
            this.selectedStateId = sf ? sf.id : null;
            if (sf && sf.id) {
              this.onStateChange(sf.id);
            }
          }
        },
        error: (err) => console.error('Failed to load states', err)
      });
    }
  }

  autoSelectCountryStateCity(): void {
    this.upsertLocationFromForm();
  }

  upsertLocationFromForm(): void {
    const loc = this.hotelForm.get('location') as FormGroup;
    const payload = {
      country_name: (loc.get('country')?.value || '').toString().trim(),
      state_name: (loc.get('state')?.value || '').toString().trim(),
      city_name: (loc.get('city')?.value || '').toString().trim()
    };
    if (!payload.country_name && !payload.state_name && !payload.city_name) {
      return;
    }
    this.userService.upsertLocation(payload).subscribe({
      next: (res) => {
        const data = (res && (res.data || res)) || {};
        const country = data.country || null;
        const state = data.state || null;
        const city = data.city || null;
        const patch: any = {};
        if (country) {
          patch.country = country.name || payload.country_name;
          this.selectedCountryId = country.id || null;
        }
        if (state) {
          patch.state = state.name || payload.state_name;
          this.selectedStateId = state.id || null;
        }
        if (city) {
          patch.city = city.name || payload.city_name;
          this.selectedCityId = city.id || null;
        }
        if (Object.keys(patch).length) {
          loc.patchValue(patch);
        }
      },
      error: () => {}
    });
  }

  onStateChange(stateId: number): void {
    const state = this.states.find((s: any) => s.id === stateId);
    const loc = this.hotelForm.get('location') as FormGroup;
    loc.patchValue({
      state: state ? state.name : ''
    });
    this.selectedStateId = stateId || null;
    this.cities = [];
    this.selectedCityId = null;
    if (stateId) {
      this.userService.getCitiesByState(stateId).subscribe({
        next: (response) => {
          this.cities = Array.isArray(response)
            ? response
            : response?.data
              ? response.data
              : [];
          const cn = (loc.get('city')?.value || '').toString().trim();
          if (cn) {
            const cf = this.cities.find(
              (c: any) => String(c.name).toLowerCase() === cn.toLowerCase()
            );
            this.selectedCityId = cf ? cf.id : null;
          }
        },
        error: (err) => {}
      });
    }
  }

  onCityChange(cityId: number): void {
    const city = this.cities.find((c: any) => c.id === cityId);
    const loc = this.hotelForm.get('location') as FormGroup;
    loc.patchValue({
      city: city ? city.name : ''
    });
    this.selectedCityId = cityId || null;
  }
}
