// src/environments/environment.ts
declare global {
  interface Window {
    APP_ENV: any;
  }
}

export const environment = {
  production: false,
  apiUrl: window.APP_ENV?.apiUrl || 'http://localhost/crm/deploye/public/api',
  imgUrl: window.APP_ENV?.imgUrl || 'http://localhost/crm/deploye/public/',
  //production

  // apiUrl: 'https://api.travstock.com/api',
  //imgUrl: 'https://api.travstock.com',
  googleMapsApiKey: 'AIzaSyCG5IEOSZwoY0LlVnS0EtOjV5cR7OjWevI'
};
