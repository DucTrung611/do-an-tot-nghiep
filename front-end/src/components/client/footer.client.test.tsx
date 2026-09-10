import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Footer from './footer.client';

describe('Footer', () => {
    it('renders a footer element without crashing', () => {
        const { container } = render(<Footer />);
        expect(container.querySelector('footer')).not.toBeNull();
    });
});
