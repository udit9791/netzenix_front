import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RoleConfigService } from './core/services/role-config.service';

@Component({
  selector: 'vex-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(private roleConfigService: RoleConfigService) {}

  ngOnInit(): void {
    this.roleConfigService.applySavedConfigOnStart();
  }
}
