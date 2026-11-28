// Client-safe password rule shared by every form that sets a login password
// (professional login, spouse logins, user management) and its server action.
export const MIN_PASSWORD_LENGTH = 8;

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
