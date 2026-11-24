// Fills the database with demo data for testing and screenshots:
//   - two users, "alice" (User A) and "bob" (User B)
//   - a few employees for each, some with a generated profile picture
//
// Run it with:   npm run seed
// It is safe to run again: it first removes the two demo users and their
// employees (and picture files), then recreates them. Other users are never touched.
import zlib from 'node:zlib';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { flushLogs } from '../config/logger';
import { Employee } from '../models/Employee';
import { User } from '../models/User';
import { deleteImage, saveImage } from '../utils/imageStorage';

// Test credentials only. They meet the password rules and protect nothing real.
const DEMO_PASSWORD = 'Demo@12345';

interface DemoEmployee {
  first: string;
  last: string;
  position: string;
  department: string;
  salary: number;
  joined: string;
  picture: boolean;
}

const demoUsers: { username: string; email: string; employees: DemoEmployee[] }[] = [
  {
    username: 'alice',
    email: 'alice@example.com',
    employees: [
      { first: 'Emma', last: 'Johnson', position: 'Software Engineer', department: 'Engineering', salary: 98000, joined: '2022-03-14', picture: true },
      { first: 'Liam', last: 'Chen', position: 'QA Engineer', department: 'Engineering', salary: 82000, joined: '2023-01-09', picture: true },
      { first: 'Olivia', last: 'Martin', position: 'Product Manager', department: 'Product', salary: 105000, joined: '2021-07-19', picture: false },
      { first: 'Noah', last: 'Williams', position: 'Financial Analyst', department: 'Finance', salary: 76000, joined: '2023-09-05', picture: true },
      { first: 'Sophia', last: 'Brown', position: 'HR Specialist', department: 'Human Resources', salary: 68000, joined: '2022-11-21', picture: false },
      { first: 'Mason', last: 'Davis', position: 'Sales Representative', department: 'Sales', salary: 64000, joined: '2024-02-12', picture: true },
    ],
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    employees: [
      { first: 'Isabella', last: 'Garcia', position: 'Software Engineer', department: 'Engineering', salary: 101000, joined: '2020-05-18', picture: true },
      { first: 'Lucas', last: 'Rodriguez', position: 'DevOps Engineer', department: 'Engineering', salary: 93000, joined: '2022-08-01', picture: false },
      { first: 'Mia', last: 'Wilson', position: 'Marketing Manager', department: 'Marketing', salary: 89000, joined: '2021-10-11', picture: true },
      { first: 'Ethan', last: 'Moore', position: 'Accountant', department: 'Finance', salary: 72000, joined: '2023-04-03', picture: true },
      { first: 'Ava', last: 'Taylor', position: 'Customer Support Lead', department: 'Support', salary: 61000, joined: '2024-01-15', picture: false },
    ],
  },
];

// Pairs of [top, bottom] background colours for the generated avatars.
const PALETTE: [number[], number[]][] = [
  [[59, 130, 246], [29, 78, 216]],
  [[16, 185, 129], [4, 120, 87]],
  [[245, 158, 11], [180, 83, 9]],
  [[236, 72, 153], [157, 23, 77]],
  [[139, 92, 246], [91, 33, 182]],
  [[239, 68, 68], [153, 27, 27]],
];

// Draws a simple "person" avatar (head and shoulders on a gradient) as a PNG,
// using nothing but Node's built-in zlib.
function makeAvatar(variant: number): Buffer {
  const size = 160;
  const [top, bottom] = PALETTE[variant % PALETTE.length] as [number[], number[]];
  const rows: Buffer[] = [];

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // first byte is the PNG filter type (0 = none)
    for (let x = 0; x < size; x++) {
      const t = y / (size - 1);
      const head = Math.hypot(x - 80, y - 62) <= 27;
      const shoulders = ((x - 80) / 62) ** 2 + ((y - 168) / 58) ** 2 <= 1;
      for (let c = 0; c < 3; c++) {
        const background = (top[c] as number) * (1 - t) + (bottom[c] as number) * t;
        const value = head || shoulders ? background * 0.15 + 255 * 0.85 : background;
        row[1 + x * 3 + c] = Math.round(value);
      }
    }
    rows.push(row);
  }

  const chunk = (type: string, data: Buffer): Buffer => {
    const header = Buffer.alloc(4);
    header.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([header, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit depth, colour type 2 (RGB)

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function removeExistingDemoData(): Promise<void> {
  const existing = await User.find({ username: { $in: demoUsers.map((user) => user.username) } });

  for (const user of existing) {
    const employees = await Employee.find({ user: user._id });
    for (const employee of employees) await deleteImage(employee.profile_picture);
    await Employee.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
  }
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to seed demo data while NODE_ENV=production. Add --force if you really mean it.');
    process.exit(1);
  }

  await connectDatabase();
  await removeExistingDemoData();

  let avatarCount = 0;
  for (const demo of demoUsers) {
    const user = await User.create({ username: demo.username, email: demo.email, password: DEMO_PASSWORD });

    for (const item of demo.employees) {
      const picture = item.picture ? await saveImage({ buffer: makeAvatar(avatarCount++) }) : null;
      await Employee.create({
        first_name: item.first,
        last_name: item.last,
        email: `${item.first}.${item.last}@example.com`.toLowerCase(),
        position: item.position,
        department: item.department,
        salary: item.salary,
        date_of_joining: new Date(item.joined),
        profile_picture: picture,
        user: user._id,
      });
    }
    console.log(`Created user "${demo.username}" with ${demo.employees.length} employees`);
  }

  console.log('\nDemo logins (test credentials only):');
  for (const demo of demoUsers) {
    console.log(`  username: ${demo.username.padEnd(6)} email: ${demo.email.padEnd(18)} password: ${DEMO_PASSWORD}`);
  }
}

main()
  .then(async () => {
    await disconnectDatabase();
    await flushLogs();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Seeding failed:', error instanceof Error ? error.message : error);
    await flushLogs();
    process.exit(1);
  });
