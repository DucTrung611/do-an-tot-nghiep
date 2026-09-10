import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Loading from './loading';

describe('Loading', () => {
    it('renders a spinner without crashing', () => {
        const { container } = render(<Loading />);
        expect(container.querySelector('span')).not.toBeNull();
    });
});
