import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the extension name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'AWS Copilot' })).toBeInTheDocument();
});
