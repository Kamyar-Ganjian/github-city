import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',use:{locale:'en-US',baseURL:'http://localhost:3000',viewport:{width:1440,height:1000},launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},webServer:{command:'npm run dev',url:'http://localhost:3000',reuseExistingServer:!process.env.CI},reporter:'list'});
