import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightGroupRequestComponent } from './flight-group-request.component';

describe('FlightGroupRequestComponent', () => {
  let component: FlightGroupRequestComponent;
  let fixture: ComponentFixture<FlightGroupRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightGroupRequestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FlightGroupRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
