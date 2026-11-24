// Adds the authenticated user to Express' Request type. It is set by the
// authenticate middleware and is the only trusted source of "who is calling".
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      username: string;
    };
  }
}
