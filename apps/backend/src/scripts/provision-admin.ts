import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';

const prisma = new PrismaClient();

async function readSecret(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    const input = createInterface({ input: stdin, output: stdout });
    try {
      return await input.question(prompt);
    } finally {
      input.close();
    }
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  return new Promise<string>((resolve, reject) => {
    let secret = '';

    const finish = (): void => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };

    const onData = (chunk: string): void => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish();
          reject(new Error('Provisioning cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          resolve(secret);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          secret = secret.slice(0, -1);
          continue;
        }
        if (character >= ' ') {
          secret += character;
        }
      }
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const input = createInterface({ input: stdin, output: stdout });

  const email = (await input.question('Admin email: ')).trim().toLowerCase();
  input.close();
  const password = await readSecret('Admin password: ');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid admin email is required.');
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error('The admin password must contain between 12 and 128 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    const admin = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            role: UserRole.ADMIN,
            isActive: true,
            passwordHash,
            credentialVersion: { increment: 1 },
          },
        })
      : await tx.user.create({
          data: {
            email,
            passwordHash,
            role: UserRole.ADMIN,
            isActive: true,
          },
        });

    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'ADMIN_CREDENTIAL_PROVISIONED',
        targetType: 'USER',
        targetId: admin.id,
        metadata: { method: 'LOCAL_CLI' },
      },
    });
  });

  stdout.write('Admin credentials provisioned successfully.\n');
}

main()
  .catch(() => {
    process.stderr.write('Admin provisioning failed.\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
