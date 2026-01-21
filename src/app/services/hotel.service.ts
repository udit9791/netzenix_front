import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class HotelService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  /** Step 1: create basic hotel record */
  createHotelBasic(payload: {
    name: string;
    star_rating: number;
    built_year: number;
    hotel_id?: number | null;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotels/steps/basic`, payload);
  }

  /** List hotels with filters */
  getHotelsList(
    page: number = 0,
    perPage: number = 10,
    sortField: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    search: string = '',
    rating?: number,
    status?: 'draft' | 'completed'
  ): Observable<any> {
    const params: any = {
      page: (page + 1).toString(),
      per_page: perPage.toString(),
      sort_field: sortField,
      sort_order: sortOrder
    };
    if (search) params.search = search;
    if (rating !== undefined && rating !== null && rating !== ('' as any))
      params.rating = String(rating);
    if (status) params.status = status;
    return this.http.get(`${this.apiUrl}/hotels/list`, { params });
  }

  getHotelById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotels/${id}`);
  }

  searchHotelsAutocomplete(
    search: string,
    limit: number = 10,
    cityId?: number,
    stateId?: number,
    countryId?: number,
    excludeAssigned?: boolean,
    assignedUserId?: number,
    type?: 'normal' | 'confirm',
    tenantId?: number
  ): Observable<any> {
    const params: any = { search, limit: String(limit) };
    if (cityId) params.city_id = String(cityId);
    if (stateId) params.state_id = String(stateId);
    if (countryId) params.country_id = String(countryId);
    if (excludeAssigned) params.exclude_assigned = '1';
    if (assignedUserId) params.assigned_user_id = String(assignedUserId);
    if (type) params.type = type;
    if (tenantId !== undefined && tenantId !== null) {
      params.tenant_id = String(tenantId);
    }
    return this.http.get(`${this.apiUrl}/hotels/assigned`, { params });
  }

  getAssignedHotels(
    search: string = '',
    limit: number = 10,
    cityId?: number,
    stateId?: number,
    countryId?: number,
    type?: 'normal' | 'confirm',
    tenantId?: number
  ): Observable<any> {
    const params: any = {
      limit: String(limit)
    };
    if (search) params.search = search;
    if (cityId) params.city_id = String(cityId);
    if (stateId) params.state_id = String(stateId);
    if (countryId) params.country_id = String(countryId);
    if (type) params.type = type;
    if (tenantId !== undefined && tenantId !== null) {
      params.tenant_id = String(tenantId);
    }
    return this.http.get(`${this.apiUrl}/hotels/assigned`, { params });
  }

  searchUnassignedHotels(
    search: string,
    limit: number = 10,
    cityId?: number,
    stateId?: number,
    countryId?: number,
    tenantId?: number
  ): Observable<any> {
    const params: any = { search, limit: String(limit) };
    if (cityId) params.city_id = String(cityId);
    if (stateId) params.state_id = String(stateId);
    if (countryId) params.country_id = String(countryId);
    if (tenantId !== undefined && tenantId !== null) {
      params.tenant_id = String(tenantId);
    }
    return this.http.get(`${this.apiUrl}/hotels/unassigned`, { params });
  }
  searchAvailability(params: {
    q: string;
    from: string;
    to: string;
    rooms?: number;
    adults?: number;
    children?: number;
    childAges?: number[];
    petFriendly?: boolean;
    inventory_id?: number;
    type?: 'normal' | 'confirm';
  }): Observable<any> {
    const p: any = {
      q: params.q || '',
      from: params.from,
      to: params.to
    };
    if (params.rooms !== undefined) p.rooms = String(params.rooms);
    if (params.adults !== undefined) p.adults = String(params.adults);
    if (params.children !== undefined) p.children = String(params.children);
    if (params.childAges && params.childAges.length) {
      p.childAges = params.childAges.join(',');
    }
    if (params.petFriendly) p.petFriendly = '1';
    if (params.inventory_id !== undefined && params.inventory_id !== null) {
      p.inventory_id = String(params.inventory_id);
    }
    if (params.type) {
      p.type = params.type;
    }
    return this.http.get(`${this.apiUrl}/hotels/search-availability`, {
      params: p
    });
  }
  detailAvailability(params: {
    from: string;
    to: string;
    rooms?: number;
    adults?: number;
    children?: number;
    childAges?: number[];
    inventory_id: number;
    type?: 'normal' | 'confirm';
  }): Observable<any> {
    const p: any = {
      from: params.from,
      to: params.to,
      inventory_id: String(params.inventory_id)
    };
    if (params.rooms !== undefined) p.rooms = String(params.rooms);
    if (params.adults !== undefined) p.adults = String(params.adults);
    if (params.children !== undefined) p.children = String(params.children);
    if (params.childAges && params.childAges.length) {
      p.childAges = params.childAges.join(',');
    }
    if (params.type) {
      p.type = params.type;
    }
    return this.http.get(`${this.apiUrl}/hotels/detail-availability`, {
      params: p
    });
  }
  getHotelRooms(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotels/${id}/rooms`);
  }

  saveAllDetails(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotels/steps/save-all`, payload);
  }

  saveLocation(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotels/steps/location`, payload);
  }

  getAmenities(type: string = 'hotel'): Observable<any> {
    const params: any = { type };
    return this.http.get(`${this.apiUrl}/amenities`, { params });
  }

  saveAmenities(payload: {
    hotel_id: number;
    amenities: number[];
    type?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotels/steps/amenities`, payload);
  }

  saveRooms(
    payload: { hotel_id: number; rooms: any[] },
    roomPhotosByIndex?: { [index: number]: File[] }
  ): Observable<any> {
    const hasFiles = roomPhotosByIndex && Object.keys(roomPhotosByIndex).length;
    if (hasFiles) {
      const form = new FormData();
      form.append('hotel_id', String(payload.hotel_id));
      form.append('rooms', JSON.stringify(payload.rooms ?? []));
      Object.keys(roomPhotosByIndex as any).forEach((k) => {
        const idx = Number(k);
        const files = (roomPhotosByIndex as any)[idx] || [];
        files.forEach((f: File) => form.append(`room_photos[${idx}][]`, f));
      });
      return this.http.post(`${this.apiUrl}/hotels/steps/rooms`, form);
    }
    return this.http.post(`${this.apiUrl}/hotels/steps/rooms`, payload);
  }

  uploadHotelMedia(
    hotelId: number,
    photos: File[],
    videos: File[],
    photoTypes?: number[],
    roomIds?: number[]
  ): Observable<any> {
    const form = new FormData();
    form.append('hotel_id', String(hotelId));
    photos?.forEach((f) => form.append('photos[]', f));
    videos?.forEach((f) => form.append('videos[]', f));
    if (photoTypes && photoTypes.length) {
      photoTypes.forEach((t) => form.append('photo_types[]', String(t)));
    }
    if (roomIds && roomIds.length) {
      roomIds.forEach((r) => form.append('room_ids[]', String(r)));
    }
    return this.http.post(`${this.apiUrl}/hotels/media/upload`, form);
  }

  getPhotoTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotels/photo-types`);
  }

  deleteHotelMedia(
    hotelId: number,
    url: string,
    type?: 'photo' | 'video'
  ): Observable<any> {
    const payload: any = { hotel_id: hotelId, url };
    if (type) payload.type = type;
    return this.http.post(`${this.apiUrl}/hotels/media/delete`, payload);
  }

  toggleHotelStatus(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/hotels/${id}/toggle-status`, {});
  }

  createHotelInventories(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotel-inventories`, payload);
  }

  getHotelInventories(
    type?: 'normal' | 'confirm',
    tenantId?: number,
    supplierId?: number
  ): Observable<any> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (
      tenantId !== undefined &&
      tenantId !== null &&
      tenantId !== ('' as any)
    ) {
      params = params.set('tenant_id', String(tenantId));
    }
    if (
      supplierId !== undefined &&
      supplierId !== null &&
      supplierId !== ('' as any)
    ) {
      params = params.set('supplier_id', String(supplierId));
    }
    const qs = params.toString();
    console.log('HotelService.getHotelInventories params', {
      type,
      tenantId,
      supplierId,
      qs
    });
    return this.http.get(`${this.apiUrl}/hotel-inventories`, { params });
  }

  toggleHotelInventoryStatus(id: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/hotel-inventories/${id}/toggle-status`,
      {}
    );
  }

  getHotelInventoryById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotel-inventories/${id}`);
  }

  getInventoryDates(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotel-inventories/${id}/dates`);
  }

  updateInventoryDates(
    id: number,
    payload: {
      dates: Array<{ room_id: number; date: string; no_of_room: number }>;
    }
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/hotel-inventories/${id}/dates`,
      payload
    );
  }

  importInventoryDatesCsv(id: number, form: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/hotel-inventories/${id}/dates/import`,
      form
    );
  }

  getInventoryPricing(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotel-inventories/${id}/pricing`);
  }

  updateInventoryPricing(id: number, payload: any): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/hotel-inventories/${id}/pricing`,
      payload
    );
  }

  confirmHotelBooking(inventoryId: number, payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/hotel-inventories/${inventoryId}/confirm-booking`,
      payload
    );
  }
  holdHotelBooking(inventoryId: number, payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/hotel-inventories/${inventoryId}/hold-booking`,
      payload
    );
  }

  freezeRooms(payload: {
    hotel_inventory_id: number;
    room_id: number;
    rooms: number;
    type?: string;
    from?: string;
    to?: string;
  }): Observable<any> {
    const id = payload.hotel_inventory_id;
    const body: any = {
      rooms: payload.rooms,
      room_id: payload.room_id,
      type: payload.type || 'hotel'
    };
    if (payload.from) body.from = payload.from;
    if (payload.to) body.to = payload.to;
    return this.http.post(
      `${this.apiUrl}/hotel-inventories/${id}/freeze-rooms`,
      body
    );
  }

  getSelectedInventoryDetail(
    inventoryId: number,
    selectedDetailId: number,
    extras?: {
      from?: string;
      to?: string;
      rooms?: number;
      adults?: number;
      children?: number;
      childAges?: string;
      service_fee?: number;
      discount?: number;
      selected_room_id?: number;
      selected_meal_type?: number;
      inventory_id?: number;
    }
  ): Observable<any> {
    const params: any = { selected_detail_id: String(selectedDetailId) };
    if (extras?.from) params.from = extras.from;
    if (extras?.to) params.to = extras.to;
    if (typeof extras?.rooms === 'number') params.rooms = String(extras.rooms);
    if (typeof extras?.adults === 'number')
      params.adults = String(extras.adults);
    if (typeof extras?.children === 'number')
      params.children = String(extras.children);
    if (typeof extras?.childAges === 'string')
      params.childAges = extras.childAges;
    if (typeof extras?.service_fee === 'number')
      params.service_fee = String(extras.service_fee);
    if (typeof extras?.discount === 'number')
      params.discount = String(extras.discount);
    if (typeof extras?.selected_room_id === 'number')
      params.selected_room_id = String(extras.selected_room_id);
    if (typeof extras?.selected_meal_type === 'number')
      params.selected_meal_type = String(extras.selected_meal_type);
    if (typeof extras?.inventory_id === 'number')
      params.inventory_id = String(extras.inventory_id);
    return this.http.get(
      `${this.apiUrl}/hotel-inventories/${inventoryId}/selected-detail`,
      { params }
    );
  }
}
