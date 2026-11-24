import bcrypt from 'bcrypt';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

// bcrypt cost factor: each +1 doubles the time an attacker needs per guess.
export const BCRYPT_ROUNDS = 12;

export interface IUser {
  username: string;
  email: string;
  password: string; // always a bcrypt hash once saved
  created_at: Date;
  updated_at: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    // select: false keeps the hash out of every query unless it is requested
    // explicitly with .select('+password') (only the login code does that).
    password: { type: String, required: true, select: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      versionKey: false,
      // Second layer of protection: the hash is removed from any JSON output.
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

// Hash the password right before it is written to MongoDB. It only runs when
// the password was set or changed, so saving other fields never re-hashes it.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>('User', userSchema);
