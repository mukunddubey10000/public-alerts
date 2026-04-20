import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../src/App';

describe('App Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<App />);
    expect(getByText('Welcome to My App')).toBeTruthy();
  });
});