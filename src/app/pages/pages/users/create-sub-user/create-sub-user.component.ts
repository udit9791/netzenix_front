import { Component } from '@angular/core';
import { CreateUserComponent } from '../create-user/create-user.component';

@Component({
  selector: 'app-create-sub-user',
  standalone: true,
  imports: [CreateUserComponent],
  template: `
    <vex-create-user></vex-create-user>
  `
})
export class CreateSubUserComponent {}

