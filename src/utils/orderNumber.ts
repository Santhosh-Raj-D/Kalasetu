export function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `KS-${date}-${random}`;
}

export function generateTxnRef(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `MOCK-TXN-${random}`;
}
