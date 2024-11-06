#!/usr/bin/env bash

wp rewrite structure '/%postname%/'
wp theme activate storefront
wp wc --user=admin tool run install_pages

echo "Creating Cart and Checkout shortcode pages"
if ! wp post list --post_type=page --field=post_name | grep -q 'cart-shortcode'; then
	wp post create --post_type=page --post_title='Cart Shortcode' --post_name='cart-shortcode' --post_status=publish --page_template='template-fullwidth.php' --post_content='<!-- wp:shortcode -->[woocommerce_cart]<!-- /wp:shortcode -->'
fi
if ! wp post list --post_type=page --field=post_name | grep -q 'checkout-shortcode'; then
	wp post create --post_type=page --post_title='Checkout Shortcode' --post_name='checkout-shortcode' --post_status=publish --page_template='template-fullwidth.php' --post_content='<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->'
fi

echo "Importing sample products"
wp plugin install wordpress-importer --activate
wp import /var/www/html/wp-content/plugins/woocommerce/sample-data/sample_products.xml --authors=skip

### TODO: Setup Stripe with Webhook, once we have a support for bootstraping using JS files
echo "Configuring WooCommerce Gateway Stripe"
echo " - Updating WooCommerce Gateway Stripe settings"
wp option set woocommerce_stripe_settings --format=json "{\"enabled\":\"yes\",\"title\":\"Credit Card (Stripe)\",\"description\":\"Pay with your credit card via Stripe.\",\"api_credentials\":\"\",\"testmode\":\"yes\",\"test_publishable_key\":\"${STRIPE_PUB_KEY}\",\"test_secret_key\":\"${STRIPE_SECRET_KEY}\",\"publishable_key\":\"\",\"secret_key\":\"\",\"webhook\":\"\",\"test_webhook_secret\":\"\",\"webhook_secret\":\"\",\"inline_cc_form\":\"no\",\"statement_descriptor\":\"\",\"short_statement_descriptor\":\"\",\"capture\":\"yes\",\"payment_request\":\"yes\",\"payment_request_button_type\":\"buy\",\"payment_request_button_theme\":\"dark\",\"payment_request_button_locations\":[\"product\",\"cart\",\"checkout\"],\"payment_request_button_size\":\"default\",\"saved_cards\":\"yes\",\"logging\":\"no\",\"upe_checkout_experience_enabled\":\"yes\"}"
