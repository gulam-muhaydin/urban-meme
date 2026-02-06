import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { nanoid } from 'nanoid';

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

export function startSmtpServer({
  port,
  mailDomain,
  onEmail,
}) {
  const server = new SMTPServer({
    banner: 'TempMail SMTP Server',
    disabledCommands: ['AUTH'],

    onRcptTo(address, session, callback) {
      const rcpt = normalizeAddress(address.address);

      if (!rcpt) {
        return callback(new Error('Invalid recipient'));
      }

      if (mailDomain) {
        const domain = rcpt.split('@')[1];
        if (domain && domain !== mailDomain.toLowerCase()) {
          return callback(new Error('Unknown domain'));
        }
      }

      callback();
    },

    async onData(stream, session, callback) {
      try {
        const parsed = await simpleParser(stream);

        const rcptTo = (session.envelope.rcptTo || [])
          .map((r) => normalizeAddress(r.address))
          .filter(Boolean);

        const from = normalizeAddress(parsed.from?.text || parsed.from?.value?.[0]?.address || '');
        const subject = parsed.subject || '(no subject)';
        const text = parsed.text || '';
        const html = parsed.html || '';
        const date = parsed.date ? parsed.date.toISOString() : new Date().toISOString();

        const baseEmail = {
          id: nanoid(),
          from,
          to: rcptTo,
          subject,
          text,
          html,
          date,
          createdAt: Date.now(),
        };

        await onEmail(baseEmail);

        callback();
      } catch (err) {
        callback(err);
      }
    },
  });

  server.listen(port, '0.0.0.0');

  return server;
}
