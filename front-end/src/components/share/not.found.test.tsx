import { describe, expect, it } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import NotFound from './not.found';

describe('NotFound', () => {
    it('renders the 404 message', () => {
        renderWithProviders(<NotFound />);

        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();
    });

    it('does not crash when "Back Home" is clicked', () => {
        renderWithProviders(<NotFound />, { route: '/some/missing/page' });

        expect(() => fireEvent.click(screen.getByText('Back Home'))).not.toThrow();
    });
});
