import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { API_ORIGIN } from '../api/client';
import { makeEmployee } from '../test/helpers';
import { EmployeeAvatar } from './EmployeeAvatar';

describe('EmployeeAvatar', () => {
  it('shows the stored picture, loaded from the backend origin', () => {
    render(<EmployeeAvatar employee={makeEmployee({ profile_picture: '/uploads/abc.png' })} />);

    const image = screen.getByRole('img', { name: 'Profile picture of Jane Doe' });
    expect(image).toHaveAttribute('src', `${API_ORIGIN}/uploads/abc.png`);
  });

  it('shows a placeholder when the employee has no picture', () => {
    render(<EmployeeAvatar employee={makeEmployee({ profile_picture: null })} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('PersonIcon')).toBeInTheDocument();
  });

  it('uses the requested size', () => {
    const { container } = render(<EmployeeAvatar employee={makeEmployee()} size={120} />);

    expect(container.firstElementChild).toHaveStyle({ width: '120px', height: '120px' });
  });
});
