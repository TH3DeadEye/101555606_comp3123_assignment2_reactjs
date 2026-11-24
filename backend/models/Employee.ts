import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface IEmployee {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  salary: number;
  date_of_joining: Date;
  department: string;
  // Public path of the stored picture (for example /uploads/<file>.png), or null
  profile_picture: string | null;
  // The owner: the user who created this employee. It is always set from the
  // authenticated user (the JWT), never from the request body.
  user: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type EmployeeDocument = HydratedDocument<IEmployee>;

const employeeSchema = new Schema<IEmployee>(
  {
    first_name: { type: String, required: true, trim: true, maxlength: 50 },
    last_name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    position: { type: String, required: true, trim: true, maxlength: 100 },
    salary: { type: Number, required: true, min: 0 },
    date_of_joining: { type: Date, required: true },
    department: { type: String, required: true, trim: true, maxlength: 100 },
    profile_picture: { type: String, default: null },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { versionKey: false },
  },
);

// An email can appear only once per owner, but two different users may each
// have an employee with the same address. This index also speeds up every
// query that starts with "this user's employees".
employeeSchema.index({ user: 1, email: 1 }, { unique: true });

export const Employee = model<IEmployee>('Employee', employeeSchema);
