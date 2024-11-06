const { test, chromium } = require( '@playwright/test' );
const fs = require( 'fs' );
const qit = require( '/qitHelpers' );

/**
 * Setup the test environment
 *
 * This is act as a Isolated setup for the stripe tests.
 */
async function setup() {
	const commands = [
		'plugin install disable-emails --activate',
		'option set woocommerce_store_address "60 29th Street"',
		'option set woocommerce_store_address_2 "#343"',
		'option set woocommerce_store_city "San Francisco"',
		'option set woocommerce_default_country "US:CA"',
		'option set woocommerce_store_postcode "94110"',
		'option set woocommerce_currency "USD"',
		'option set woocommerce_product_type "both"',
		'option set woocommerce_allow_tracking "no"',
		'option set woocommerce_coming_soon "no"',
		'theme install storefront --activate',
		'wc --user=admin tool run install_pages',
		'wc shipping_zone create --name="Everywhere" --order=1 --user=admin',
		'wc shipping_zone_method create 1 --method_id="flat_rate" --user=admin',
		'wc shipping_zone_method create 1 --method_id="free_shipping" --user=admin',
		'option update --format=json woocommerce_flat_rate_1_settings \'{"title":"Flat rate","tax_status":"taxable","cost":"10"}\'',
	];

	for ( const command of commands ) {
		await qit.wp( command );
	}

	// console.log( 'Creating Cart and Checkout shortcode pages' );
	// if ( ! ( await qit.wp( 'post list --post_type=page --field=post_name' )?.output?.includes('cart-shortcode') ) ) {
	// 	await qit.wp('post create --post_type=page --post_title="Cart Shortcode" --post_name="cart-shortcode" --post_status=publish --page_template="template-fullwidth.php" --post_content="<!-- wp:shortcode -->[woocommerce_cart]<!-- /wp:shortcode -->"');
	// }

	// if ( ! ( await qit.wp( 'post list --post_type=page --field=post_name' )?.output?.includes('checkout-shortcode') ) ) {
	// 	await qit.wp('post create --post_type=page --post_title="Checkout Shortcode" --post_name="checkout-shortcode" --post_status=publish --page_template="template-fullwidth.php" --post_content="<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->"');
	// }

	// console.log( 'Importing sample products' );
	// await qit.wp('import /var/www/html/wp-content/plugins/woocommerce/sample-data/sample_products.xml --authors=skip');

	console.log( 'Setup completed.' );
}

/**
 * @param {import('@playwright/test').FullConfig} config
 */
test( 'Entrypoint', async ( { page }, testInfo ) => {
	test.slow(); // Mark test slow to triple the default timeout.

	// Do Initial Setup
	await setup();

	// Set Stipe Credentials to qit env
	qit.setEnv( 'STRIPE_PUB_KEY', process.env.STRIPE_PUB_KEY );
	qit.setEnv( 'STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY );

	// Save Admin State and WC REST API Credentials
	const { stateDir, baseURL, userAgent } = testInfo.project.use;

	// used throughout tests for authentication
	qit.setEnv( 'ADMINSTATE', `${ stateDir }/adminState.json` );
	console.log( 'Admin state file path: ' + qit.getEnv( 'ADMINSTATE' ) );

	// Clear out the previous save states
	try {
		fs.unlinkSync( qit.getEnv( 'ADMINSTATE' ) );
		console.log( 'Admin state file deleted successfully.' );
	} catch ( err ) {
		if ( err.code === 'ENOENT' ) {
			console.log( 'Admin state file does not exist.' );
		} else {
			console.log( 'Admin state file could not be deleted: ' + err );
		}
	}

	// Pre-requisites
	let adminLoggedIn = false;
	let customerKeyConfigured = false;

	// Specify user agent when running against an external test site to avoid getting HTTP 406 NOT ACCEPTABLE errors.
	const contextOptions = { baseURL, userAgent };

	// Create browser, browserContext, and page for customer and admin users
	const browser = await chromium.launch();
	const adminContext = await browser.newContext( contextOptions );
	const adminPage = await adminContext.newPage();

	// Sign in as admin user and save state
	const adminRetries = 5;
	for ( let i = 0; i < adminRetries; i++ ) {
		try {
			await qit.loginAsAdmin( adminPage );
			await adminPage
				.context()
				.storageState( { path: qit.getEnv( 'ADMINSTATE' ) } );
			console.log( 'Logged-in as admin successfully.' );
			adminLoggedIn = true;
			break;
		} catch ( e ) {
			console.log(
				`Admin log-in failed, Retrying... ${ i }/${ adminRetries }`
			);
			console.log( e );
		}
	}

	if ( ! adminLoggedIn ) {
		console.error(
			'Cannot proceed e2e test, as admin login failed. Please check if the test site has been setup correctly.'
		);
		process.exit( 1 );
	}

	// While we're here, let's add a consumer token for API access
	// This step was failing occasionally, and globalsetup doesn't retry, so make it retry
	const nRetries = 5;
	for ( let i = 0; i < nRetries; i++ ) {
		try {
			console.log( 'Trying to add consumer token...' );
			await adminPage.goto(
				`/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys&create-key=1`
			);
			await adminPage
				.locator( '#key_description' )
				.fill( 'Key for API access' );
			await adminPage
				.locator( '#key_permissions' )
				.selectOption( 'read_write' );
			await adminPage.locator( 'text=Generate API key' ).click();
			qit.setEnv(
				'CONSUMER_KEY',
				await adminPage.locator( '#key_consumer_key' ).inputValue()
			);
			qit.setEnv(
				'CONSUMER_SECRET',
				await adminPage.locator( '#key_consumer_secret' ).inputValue()
			);
			console.log( 'Added consumer token successfully.' );
			customerKeyConfigured = true;
			break;
		} catch ( e ) {
			console.log(
				`Failed to add consumer token. Retrying... ${ i }/${ nRetries }`
			);
			console.log( e );
		}
	}

	if ( ! customerKeyConfigured ) {
		console.error(
			'Cannot proceed e2e test, as we could not set the customer key. Please check if the test site has been setup correctly.'
		);
		process.exit( 1 );
	}

	await adminContext.close();
	await browser.close();
} );
