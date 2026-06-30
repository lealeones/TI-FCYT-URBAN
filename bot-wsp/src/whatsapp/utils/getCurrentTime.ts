export function getCurrentTime(): Date {
  const now = new Date();
  return new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds());
}