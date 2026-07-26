import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("[FATAL] JWT_SECRET env var is not set");
}

// After the guard above, JWT_SECRET is guaranteed to be a string.
const SECRET = JWT_SECRET as string;

export const signToken = (
  payload: { id: string; role: string; name: string },
  expiresIn = "7d"
): string => {
  return jwt.sign(payload, SECRET, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, SECRET);
};
