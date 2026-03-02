import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'sa.sayyir.app',
  appName: 'Sayyir',
  webDir: 'public',
  server: {
    url: 'https://sayyir.sa',
    cleartext: true
  }
};

export default config;