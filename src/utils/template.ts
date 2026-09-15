export function interpolateTemplate(
  template: string,
  context: { vuId: number; reqId: number }
): string {
  if (!template) return template;

  return template
    .replace(/\{\{\$guid\}\}/g, () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    })
    .replace(/\{\{\$timestamp\}\}/g, () => Date.now().toString())
    .replace(/\{\{\$randomInt\((\d+),\s*(\d+)\)\}\}/g, (_, minStr, maxStr) => {
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
    })
    .replace(/\{\{\$randomInt\}\}/g, () => {
      return (Math.floor(Math.random() * 1000) + 1).toString();
    })
    .replace(/\{\{\$userId\}\}/g, () => (context.vuId + 1).toString())
    .replace(/\{\{\$reqId\}\}/g, () => context.reqId.toString());
}