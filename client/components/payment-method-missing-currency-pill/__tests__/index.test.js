import React from 'react';
import { screen, render } from '@testing-library/react';
import PaymentMethodMissingCurrencyPill from '..';
import UpeToggleContext from '../../../settings/upe-toggle/context';

jest.mock( '../../../payment-methods-map', () => ( {
	card: { currencies: [] },
	giropay: { currencies: [ 'EUR' ] },
} ) );

describe( 'PaymentMethodMissingCurrencyPill', () => {
	beforeEach( () => {
		global.wcSettings = { currency: { code: 'USD' } };
	} );

	it( 'should render the "Requires currency" text', () => {
		render(
			<UpeToggleContext.Provider value={ { isUpeEnabled: true } }>
				<PaymentMethodMissingCurrencyPill
					id="giropay"
					label="giropay"
				/>
			</UpeToggleContext.Provider>
		);

		expect( screen.queryByText( 'Requires currency' ) ).toBeInTheDocument();
	} );

	it( 'should not render when UPE is disabled', () => {
		const { container } = render(
			<UpeToggleContext.Provider value={ { isUpeEnabled: false } }>
				<PaymentMethodMissingCurrencyPill
					id="giropay"
					label="giropay"
				/>
			</UpeToggleContext.Provider>
		);

		expect( container.firstChild ).toBeNull();
	} );

	it( 'should not render when currency matches', () => {
		global.wcSettings = { currency: { code: 'EUR' } };
		const { container } = render(
			<UpeToggleContext.Provider value={ { isUpeEnabled: true } }>
				<PaymentMethodMissingCurrencyPill
					id="giropay"
					label="giropay"
				/>
			</UpeToggleContext.Provider>
		);

		expect( container.firstChild ).toBeNull();
	} );

	it( 'should render when currency differs', () => {
		render(
			<UpeToggleContext.Provider value={ { isUpeEnabled: true } }>
				<PaymentMethodMissingCurrencyPill
					id="giropay"
					label="giropay"
				/>
			</UpeToggleContext.Provider>
		);

		expect( screen.queryByText( 'Requires currency' ) ).toBeInTheDocument();
	} );
} );