/** Keep the existing LC + six-character format without predictable randomness. */
export const generateOrderCode = (): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'LC';
  const bytes = new Uint8Array(16);
  while (code.length < 8) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      // Rejection sampling avoids bias from mapping 256 values to 36 symbols.
      if (byte >= 252) continue;
      code += alphabet[byte % alphabet.length];
      if (code.length === 8) break;
    }
  }
  return code;
};