import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { Employee } from '../api/types';
import { formatDate, formatSalary, fullName } from '../utils/format';
import { compareEmployees, type EmployeeSortKey } from '../utils/sortEmployees';
import { EmployeeAvatar } from './EmployeeAvatar';

type Direction = 'asc' | 'desc';

// Columns that do not fit on a small screen disappear; the name cell then
// repeats the position and department under the name.
interface Column {
  key: EmployeeSortKey;
  label: string;
  hideBelow?: 'md' | 'lg';
  align?: 'right';
}
const COLUMNS: Column[] = [
  { key: 'name', label: 'Employee' },
  { key: 'position', label: 'Position', hideBelow: 'md' },
  { key: 'department', label: 'Department', hideBelow: 'md' },
  { key: 'joined', label: 'Date joined', hideBelow: 'lg' },
  { key: 'salary', label: 'Salary', hideBelow: 'lg', align: 'right' },
];

const hideBelow = (breakpoint?: 'md' | 'lg') =>
  breakpoint ? { display: { xs: 'none', [breakpoint]: 'table-cell' } } : undefined;

// Lets a long address break after the @ on a narrow screen, instead of in the
// middle of a word. (The text content stays exactly the address.)
function BreakableEmail({ email }: { email: string }) {
  const at = email.indexOf('@');
  if (at < 0) return <>{email}</>;
  return (
    <>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </>
  );
}

interface EmployeeTableProps {
  employees: Employee[];
  onDelete: (employee: Employee) => void;
  // While this employee is being deleted its buttons are disabled
  deletingId?: string | null;
}

const PAGE_SIZES = [10, 25, 50];

export function EmployeeTable({ employees, onDelete, deletingId = null }: EmployeeTableProps) {
  const [orderBy, setOrderBy] = useState<EmployeeSortKey>('name');
  const [direction, setDirection] = useState<Direction>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0] as number);

  const sorted = useMemo(() => {
    const factor = direction === 'asc' ? 1 : -1;
    return [...employees].sort((a, b) => factor * compareEmployees(a, b, orderBy));
  }, [employees, orderBy, direction]);

  // A shorter list (after a search or a delete) can leave the page number too high.
  const lastPage = Math.max(0, Math.ceil(sorted.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows = sorted.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

  const sortBy = (key: EmployeeSortKey) => {
    setDirection(orderBy === key && direction === 'asc' ? 'desc' : 'asc');
    setOrderBy(key);
  };

  return (
    <Paper>
      <TableContainer>
        <Table aria-label="Employees">
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align}
                  sortDirection={orderBy === column.key ? direction : false}
                  sx={hideBelow(column.hideBelow)}
                >
                  <TableSortLabel
                    active={orderBy === column.key}
                    direction={orderBy === column.key ? direction : 'asc'}
                    onClick={() => sortBy(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((employee) => {
              const name = fullName(employee);
              const deleting = deletingId === employee._id;
              return (
                <TableRow key={employee._id} hover>
                  <TableCell component="th" scope="row" sx={{ px: { xs: 1, sm: 2 } }}>
                    <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'center' }}>
                      <EmployeeAvatar employee={employee} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          <BreakableEmail email={employee.email} />
                        </Typography>
                        <Typography variant="body2" sx={{ display: { xs: 'block', md: 'none' } }}>
                          {employee.position} · {employee.department}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={hideBelow('md')}>{employee.position}</TableCell>
                  <TableCell sx={hideBelow('md')}>{employee.department}</TableCell>
                  <TableCell sx={hideBelow('lg')}>{formatDate(employee.date_of_joining)}</TableCell>
                  <TableCell align="right" sx={hideBelow('lg')}>
                    {formatSalary(employee.salary)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', px: { xs: 0.5, sm: 2 } }}>
                    <Tooltip title="View details">
                      <IconButton component={RouterLink} to={`/employees/${employee._id}`} aria-label={`View ${name}`}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton component={RouterLink} to={`/employees/${employee._id}/edit`} aria-label={`Edit ${name}`}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      {/* the span lets the tooltip work while the button is disabled */}
                      <span>
                        <IconButton color="error" aria-label={`Delete ${name}`} onClick={() => onDelete(employee)} disabled={deleting}>
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {sorted.length > (PAGE_SIZES[0] as number) && (
        <TablePagination
          component="div"
          count={sorted.length}
          page={currentPage}
          onPageChange={(_event, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={PAGE_SIZES}
          labelRowsPerPage="Rows per page"
        />
      )}
    </Paper>
  );
}

// Grey placeholder rows shown while the first load is running. They have the
// shape of the real table, so the page does not jump when the data arrives.
export function EmployeeTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Paper aria-busy="true">
      <Box role="status" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Loading employees…
      </Box>
      <Table aria-hidden="true">
        <TableBody>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton width="40%" />
                    <Skeleton width="25%" />
                  </Box>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
