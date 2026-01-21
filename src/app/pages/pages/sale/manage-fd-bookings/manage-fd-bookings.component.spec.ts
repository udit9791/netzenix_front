import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageFdBookingsComponent } from './manage-fd-bookings.component';

describe('ManageFdBookingsComponent', () => {
  let component: ManageFdBookingsComponent;
  let fixture: ComponentFixture<ManageFdBookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageFdBookingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageFdBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
