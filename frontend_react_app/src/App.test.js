import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
    render(<App />);

    // The UI title uses a non-breaking hyphen (U+2011): "Retro To‑Do".
    // Match either "-" or "‑" so the test is resilient to typography changes.
    const title = screen.getByText(/retro to[-‑]do/i);
    expect(title).toBeInTheDocument();
});
