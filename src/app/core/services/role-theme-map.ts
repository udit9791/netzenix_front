export const RoleThemeMap: Record<
  string,
  { configId?: string; bodyClass?: string; themeClass?: string }
> = {
  'Super Admin': {
    configId: 'apollo',
    bodyClass: 'vex-layout-apollo',
    themeClass: 'vex-theme-default'
  },
  Admin: {
    configId: 'poseidon',
    bodyClass: 'vex-layout-poseidon',
    themeClass: 'vex-theme-default'
  },
  Supplier: {
    configId: 'hermes',
    bodyClass: 'vex-layout-hermes',
    themeClass: 'vex-theme-default'
  },
  Reseller: {
    configId: 'zeus',
    bodyClass: 'vex-layout-zeus',
    themeClass: 'vex-theme-default'
  },
  Individual: {
    configId: 'ikaros',
    bodyClass: 'vex-layout-ikaros',
    themeClass: 'vex-theme-default'
  },
  Agent: {
    configId: 'ares',
    bodyClass: 'vex-layout-ares',
    themeClass: 'vex-theme-default'
  },
  SME: {
    configId: 'poseidon',
    bodyClass: 'vex-layout-poseidon',
    themeClass: 'vex-theme-default'
  },
  Corporate: {
    configId: 'apollo',
    bodyClass: 'vex-layout-apollo',
    themeClass: 'vex-theme-default'
  }
};
