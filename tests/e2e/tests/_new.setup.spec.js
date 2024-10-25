import { expect, test as setup } from '@playwright/test';
import qit from '/qitHelpers';

setup( 'Disable legacy checkout experience', async ( { browser } ) => {
	const adminContext = await browser.newContext( {
		storageState: qit.getEnv( 'ADMINSTATE' ),
	} );
	const page = await adminContext.newPage();

	await page.goto(
		'/wp-admin/admin.php?page=wc-settings&tab=checkout&section=stripe&panel=settings'
	);
	await page.uncheck( 'text=Enable the legacy checkout experience' );
	await page.click( 'text=Save changes' );

	await expect( page.getByText( 'Settings saved.' ) ).toBeDefined();
	await expect(
		page.getByTestId( 'legacy-checkout-experience-checkbox' )
	).not.toBeChecked();
} );
