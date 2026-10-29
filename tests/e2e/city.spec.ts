import {test,expect} from '@playwright/test';
const repository={owner:'example',name:'architecture',branch:'develop',description:'A test repository',stars:5,files:[{id:'src/main.ts',path:'src/main.ts',name:'main.ts',directory:'src',extension:'ts',language:'TypeScript',size:3000},{id:'README.md',path:'README.md',name:'README.md',directory:'/',extension:'md',language:'Markdown',size:500}]};
test('load, search, select, inspect and browse',async({page})=>{
 await page.route('**/api/repository?*',route=>route.fulfill({json:repository}));
 await page.goto('/');await page.getByLabel('CHOOSE YOUR REPOSITORY').fill('example/architecture');await page.getByRole('button',{name:'Explore city'}).click();
 await expect(page.getByRole('heading',{name:'architecture / CITY'})).toBeVisible();
 await page.getByRole('combobox').fill('main');await page.getByRole('combobox').press('ArrowDown');await page.getByRole('combobox').press('Enter');
 await expect(page.getByRole('heading',{name:'main.ts'})).toBeVisible();await expect(page.getByRole('link',{name:'Open file on GitHub'})).toHaveAttribute('href','https://github.com/example/architecture/blob/develop/src/main.ts');
 await page.getByRole('button',{name:'File browser',exact:false}).click();await expect(page.getByRole('heading',{name:'Repository file browser'})).toBeVisible();
});
test('API errors are announced',async({page})=>{await page.route('**/api/repository?*',route=>route.fulfill({status:429,json:{error:'GitHub request limit reached.'}}));await page.goto('/');await page.getByRole('button',{name:'React',exact:false}).first().click();await expect(page.getByRole('alert')).toContainText('request limit')});
test('exports an actual PNG',async({page})=>{await page.route('**/api/repository?*',route=>route.fulfill({json:repository}));await page.goto('/');await page.getByRole('button',{name:'React',exact:false}).first().click();await expect(page.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'Screenshot',exact:false}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download PNG'}).click();expect((await download).suggestedFilename()).toBe('github-city.png')});
test('optional real public GitHub smoke test',async({request})=>{test.skip(process.env.REAL_GITHUB_SMOKE!=='1','Enable explicitly when network is available');const response=await request.get('/api/repository?q=octocat/Hello-World');expect(response.ok()).toBeTruthy();expect((await response.json()).files.length).toBeGreaterThan(0)});
