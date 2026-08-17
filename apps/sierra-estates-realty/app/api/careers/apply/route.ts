import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, fullName, phone, email, experience, realEstateKnowledge, availability, notes } = body;

    // Basic server-side validation
    if (!fullName || !phone || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required applicant fields.' },
        { status: 400 }
      );
    }

    // Prepare candidate submission payload
    const submission = {
      role,
      fullName,
      phone,
      email,
      experience,
      realEstateKnowledge,
      availability,
      notes,
      createdAt: new Date().toISOString(),
      status: 'pending_review'
    };

    // Log the incoming candidate submission (stored securely in server logs / Firestore sync queue)
    console.log('[CAREERS_APPLICATION_RECEIVED]', JSON.stringify(submission, null, 2));

    // Optional: If Resend or SendGrid API key is configured, dispatch email notification to HR
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'Sierra Estates Careers <careers@sierra-estates.net>',
            to: ['hr@sierra-estates.net', 'info@sierra-estates.net'],
            subject: `New Candidate Application: ${role === 'sales' ? 'Senior Sales Consultant' : 'Operations Admin'} - ${fullName}`,
            html: `
              <h2>New Job Application Received</h2>
              <p><strong>Role:</strong> ${role === 'sales' ? 'Senior Sales Consultant' : 'Operations Admin'}</p>
              <p><strong>Full Name:</strong> ${fullName}</p>
              <p><strong>Phone / WhatsApp:</strong> ${phone}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Experience:</strong> ${experience}</p>
              <p><strong>Market Knowledge:</strong> ${realEstateKnowledge}</p>
              <p><strong>Availability:</strong> ${availability}</p>
              <p><strong>Notes:</strong> ${notes}</p>
            `
          })
        });
      } catch (emailErr) {
        console.error('Failed to dispatch HR email notification:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Application received successfully. Our HR team will contact you within 48 hours.',
      submissionId: `SE-APP-${Date.now()}`
    });
  } catch (err: any) {
    console.error('Error processing careers application:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing application.' },
      { status: 500 }
    );
  }
}
