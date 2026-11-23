export function sendTestPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  config: { subject: string; publicKey: string; privateKey: string },
): Promise<void>;
