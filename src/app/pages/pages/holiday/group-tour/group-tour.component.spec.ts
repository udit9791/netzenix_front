import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupTourComponent } from './group-tour.component';

describe('GroupTourComponent', () => {
  let component: GroupTourComponent;
  let fixture: ComponentFixture<GroupTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupTourComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GroupTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
