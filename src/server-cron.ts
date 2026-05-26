import cron from 'node-cron';
import { Resend } from 'resend';
import { format, addDays } from 'date-fns';
import { dbAdmin } from './lib/firebase-admin';

/**
 * Instantiates the automated background workers for the Point 4 backend.
 */
export function initCronJobs() {
    // Pulse exactly at 10:00 AM server time, daily
    cron.schedule('0 10 * * *', async () => {
        try {
            if (!process.env.RESEND_API_KEY) {
                console.warn('Cron Engine Warning: Missing Resend API Key. Aborting Reminder scans.');
                return;
            }

            const resend = new Resend(process.env.RESEND_API_KEY);

            // Compute exact date for "Tomorrow"
            const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
            
            console.log(`Cron Engine: Running 24-Hour Scans for date -> ${tomorrow}`);

            // === 1. Checkout Reminders ===
            const checkoutSnap = await dbAdmin.collection('bookings')
                .where('check_out_date', '==', tomorrow)
                .where('checkout_completed_at', '==', null)
                .get();

            if (!checkoutSnap.empty) {
                const checkouts = checkoutSnap.docs.map(doc => doc.data());
                for (const booking of checkouts) {
                    const profileRef = await dbAdmin.collection('profiles').doc(booking.user_id).get();
                    if (!profileRef.exists) continue;
                    const profile = profileRef.data()!;
                    if (profile.email) {
                        const { data, error } = await resend.emails.send({
                            from: 'onboarding@resend.dev',
                            to: 'nicholasghickman@gmail.com', // Restricted for Resend Testing
                            subject: 'Action Required: Your Point 4 Checkout is Tomorrow',
                            html: `
                                <div style="font-family: sans-serif; color: #0A2540;">
                                    <h2>Hi ${profile.first_name || 'Guest'},</h2>
                                    <p>This is an automated reminder that you are scheduled to check out of Point 4 tomorrow (<strong>${booking.check_out_date}</strong>).</p>
                                    <p><strong>CRITICAL:</strong> Please log into the Point 4 reservation dashboard at minimum 24 hours prior to confirm and complete your mandatory Checkout Accountability procedure.</p>
                                    <br />
                                    <p>Have a safe trip back,</p>
                                    <strong>Point 4 Management Framework</strong>
                                    <br />
                                    <p style="margin-top: 20px; font-size: 0.9em; color: #666;">For questions, contact Nick Hickman at 405-816-6424 or Lou Graham at 501-690-0554</p>
                                </div>
                            `
                        });
                        if (error) console.error("Resend Checkout Reminder Error:", error);
                        else console.log(`Cron Engine: Deployed explicit checkout reminder to ${profile.email}`);
                    }
                }
            }

            // === 2. Check-in Reminders ===
            const checkinSnap = await dbAdmin.collection('bookings')
                .where('check_in_date', '==', tomorrow)
                .get();

            if (!checkinSnap.empty) {
                const checkins = checkinSnap.docs.map(doc => doc.data());
                for (const booking of checkins) {
                    const profileRef = await dbAdmin.collection('profiles').doc(booking.user_id).get();
                    if (!profileRef.exists) continue;
                    const profile = profileRef.data()!;
                    if (profile.email) {
                        const { data, error } = await resend.emails.send({
                            from: 'onboarding@resend.dev',
                            to: 'nicholasghickman@gmail.com', // Restricted for Resend Testing
                            subject: 'Reminder: Your trip to Point 4 is tomorrow!',
                            html: `
                                <div style="font-family: sans-serif; color: #0A2540;">
                                    <h2>Hi ${profile.first_name || 'Guest'},</h2>
                                    <p>Get ready! Your trip to Point 4 begins tomorrow (<strong>${booking.check_in_date}</strong>).</p>
                                    <p>You can check the dashboard for the latest details.</p>
                                    <br />
                                    <p>Safe travels,</p>
                                    <strong>Point 4 Management Framework</strong>
                                    <br />
                                    <p style="margin-top: 20px; font-size: 0.9em; color: #666;">For questions, contact Nick Hickman at 405-816-6424 or Lou Graham at 501-690-0554</p>
                                </div>
                            `
                        });
                        if (error) console.error("Resend Check-in Reminder Error:", error);
                        else console.log(`Cron Engine: Deployed check-in reminder to ${profile.email}`);
                    }
                }
            }

        } catch (err) {
            console.error('Cron Engine: Catastrophic failure executing sweep', err);
        }
    });

    console.log('Point 4 Process: Checkout Scanner Worker engaged natively on schedule.');
}
