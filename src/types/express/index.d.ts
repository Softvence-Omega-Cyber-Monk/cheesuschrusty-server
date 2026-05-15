import { JwtPayload } from 'src/module/auth/strategy/jwt.strategy';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends JwtPayload {}
    interface Request {
      rawBody?: Buffer;
    }
  }
}
