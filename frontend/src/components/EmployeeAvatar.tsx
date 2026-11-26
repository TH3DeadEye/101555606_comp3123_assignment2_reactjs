import PersonIcon from '@mui/icons-material/Person';
import Avatar from '@mui/material/Avatar';
import type { Employee } from '../api/types';
import { fullName, resolvePictureUrl } from '../utils/format';

interface EmployeeAvatarProps {
  employee: Pick<Employee, 'first_name' | 'last_name' | 'profile_picture'>;
  // Width and height in pixels
  size?: number;
}

// The employee's picture, or a placeholder person when there is none (or when
// the image cannot be loaded).
export function EmployeeAvatar({ employee, size = 40 }: EmployeeAvatarProps) {
  const src = resolvePictureUrl(employee.profile_picture);

  return (
    <Avatar
      src={src ?? undefined}
      // The placeholder is decoration: the name is always written next to it.
      alt={src ? `Profile picture of ${fullName(employee)}` : ''}
      slotProps={{ img: { loading: 'lazy' } }}
      sx={{ width: size, height: size, bgcolor: 'grey.300', color: 'grey.600' }}
    >
      <PersonIcon sx={{ fontSize: size * 0.65 }} />
    </Avatar>
  );
}
