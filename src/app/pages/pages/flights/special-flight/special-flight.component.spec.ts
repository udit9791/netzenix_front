import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecialFlightComponent } from './special-flight.component';

describe('SpecialFlightComponent', () => {
  let component: SpecialFlightComponent;
  let fixture: ComponentFixture<SpecialFlightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecialFlightComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SpecialFlightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
