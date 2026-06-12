import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key
// NOTE: Provide the API key in the environment variables: RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, html, attachments } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required fields: to, subject' }, { status: 400 });
    }

    // Convert base64 string attachments to Buffers for Resend SDK
    let processedAttachments = attachments || [];
    if (Array.isArray(processedAttachments)) {
      processedAttachments = processedAttachments.map((att: any) => {
        if (att.content && typeof att.content === 'string') {
          return {
            ...att,
            content: Buffer.from(att.content, 'base64')
          };
        }
        return att;
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is missing. Simulating email send.');
      return NextResponse.json({ success: true, simulated: true, message: 'Email simulation successful' });
    }

    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>', // Replace with your verified domain in production
      to: typeof to === 'string' ? [to] : to,
      subject: subject,
      html: html || '<p>Sent from Billing App</p>',
      attachments: processedAttachments,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
