import { Injectable } from '@angular/core';
import { vexConfigs } from 'src/@vex/config/vex-configs';
import { VexConfigService } from '@vex/config/vex-config.service';
import {
  VexConfigName,
  VexConfig,
  VexConfigs
} from '@vex/config/vex-config.interface';
import { RoleThemeMap } from './role-theme-map';

interface SavedConfig {
  configId: VexConfigName;
}

@Injectable({
  providedIn: 'root'
})
export class RoleConfigService {
  private localKey = 'vex:selectedRoleConfig';

  constructor(private configService: VexConfigService) {}

  /** Apply config based on user’s role (server or local map) */
  applyRoleConfigFromUser(user: any) {
    let configId: VexConfigName | null = null;

    // ✅ 1. If server sends theme_config
    const roleFromServer = user?.roles?.[0];
    if (roleFromServer?.theme_config) {
      const cfgKey = roleFromServer.theme_config as keyof VexConfigs;
      if (vexConfigs[cfgKey]) {
        configId = cfgKey as VexConfigName;
      }
    }

    // ✅ 2. Else fallback: role name mapping
    if (!configId) {
      const roleName = user?.role_names?.[0] || roleFromServer?.name;
      const mapping = RoleThemeMap[roleName];
      if (mapping?.configId) {
        const cfgKey = mapping.configId as keyof VexConfigs;
        if (vexConfigs[cfgKey]) {
          configId = cfgKey as VexConfigName;
        }
      }
    }

    // ✅ 3. Apply config
    if (configId) {
      this.applyConfig(configId);
      localStorage.setItem(this.localKey, JSON.stringify({ configId }));
    }
  }

  applyConfig(configId: VexConfigName) {
    const cfg: VexConfig = vexConfigs[configId];
    if (!cfg) return;

    this.configService.setConfig(configId);
    this.configService.updateConfig(cfg);
  }

  applySavedConfigOnStart() {
    const raw = localStorage.getItem(this.localKey);
    if (!raw) return;

    try {
      const { configId } = JSON.parse(raw) as SavedConfig;
      if (configId && vexConfigs[configId]) {
        this.applyConfig(configId);
      }
    } catch (e) {
      console.error('Invalid saved role config', e);
    }
  }

  clearConfig() {
    localStorage.removeItem(this.localKey);
    this.applyConfig(VexConfigName.apollo);
  }
}
