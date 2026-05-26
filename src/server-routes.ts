import { Router, Request, Response, NextFunction } from 'express';
import { Resend } from 'resend';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { dbAdmin, authAdmin } from './lib/firebase-admin';

export const apiRouter = Router();

// Extend Express Request locally to safely inject the auth payload
interface AuthRequest extends Request {
    user?: any;
}

/**
 * Safely initializes the Resend client
 */
const getResend = () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("Missing Resend API Key");
    }
    return new Resend(process.env.RESEND_API_KEY);
};

/**
 * Express Middleware: Validates the JWT Bearer token
 */
const withUserAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing authorization header' });
        return;
    }
    
    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * GET /api/bookings/public
 * Returns global bookings for calendar display.
 */
apiRouter.get('/bookings/public', async (req: Request, res: Response) => {
    try {
        const snapshot = await dbAdmin.collection('bookings').get();
        const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const profilesSnap = await dbAdmin.collection('profiles').get();
        const profilesMap = new Map();
        profilesSnap.docs.forEach(doc => {
            profilesMap.set(doc.id, doc.data());
        });

        const enriched = bookingsData.map((b: any) => ({
            ...b,
            profiles: profilesMap.get(b.user_id) || null
        }));
            
        res.json({ bookings: enriched });
    } catch (err: any) {
        console.error('Fetch Bookings Error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch bookings' });
    }
});

/**
 * POST /api/bookings
 * Validates constraints and inserts a new block booking.
 */
apiRouter.post('/bookings', withUserAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { checkInDate, checkOutDate } = req.body;
        const checkIn = parseISO(checkInDate);
        const checkOut = parseISO(checkOutDate);
        const today = startOfDay(new Date());

        // Business Rule #1: Max stay 7 consecutive days
        if (differenceInDays(checkOut, checkIn) > 7) {
            res.status(400).json({ error: 'Maximum stay limit is 7 days.' });
            return;
        }

        // Business Rule #2: Max 90 days rolling advance window
        if (differenceInDays(checkIn, today) > 90) {
            res.status(400).json({ error: 'Bookings can only be scheduled up to 90 days in advance.' });
            return;
        }
        
        if (differenceInDays(checkIn, today) < 0) {
            res.status(400).json({ error: 'Cannot book temporal anomalies in the past.' });
            return;
        }

        const newDoc = dbAdmin.collection('bookings').doc();
        const bookingData = {
            id: newDoc.id,
            user_id: req.user.uid,
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            created_at: new Date().toISOString()
        };

        await newDoc.set(bookingData);
        
        res.status(201).json({ booking: bookingData, message: "Booking confirmed successfully." });
    } catch (err: any) {
        console.error('Booking Controller Error:', err);
        res.status(500).json({ error: err.message || 'Failed to create booking' });
    }
});

apiRouter.post('/emails/notify', withUserAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { action, checkInDate, checkOutDate } = req.body;
        
        if (!process.env.RESEND_API_KEY) {
            res.json({ success: false, message: 'Resend API Key missing, skipping email' });
            return;
        }

        const resend = getResend();
        const userProfileRef = await dbAdmin.collection('profiles').doc(req.user.uid).get();
        const guestName = userProfileRef.exists ? userProfileRef.data()?.first_name : 'Guest';
        const userEmail = userProfileRef.exists ? userProfileRef.data()?.email : req.user.email;

        // Notify admins for cancellations
        if (action === 'cancel') {
            const profilesSnap = await dbAdmin.collection('profiles').where('is_admin', '==', true).get();
            const adminEmails = profilesSnap.docs.map(doc => doc.data().email).filter(Boolean);
            
            if (adminEmails.length > 0) {
                const { data, error } = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: 'nicholasghickman@gmail.com', // Restricted for Resend Testing
                    subject: 'Point 4 - Booking Cancelled (Admin Notice)',
                    html: `
                      <div style="font-family: sans-serif; color: #0A2540;">
                        <h2>Booking Cancellation Notice</h2>
                        <p>${guestName} has cancelled their reservation.</p>
                        <hr />
                        <p><strong>Dates released:</strong> ${checkInDate} to ${checkOutDate}</p>
                        <br />
                        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">For questions, contact Nick Hickman at 405-816-6424 or Lou Graham at 501-690-0554</p>
                      </div>
                    `
                });
                if (error) console.error("Resend Admin Notify Error:", error);
            }
            
            // Also notify the user
            if (userEmail) {
                 const { data, error } = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: 'nicholasghickman@gmail.com', // Restricted for Resend Testing
                    subject: 'Point 4 - Cancellation Confirmed',
                    html: `
                      <div style="font-family: sans-serif; color: #0A2540;">
                        <h2>Hi ${guestName},</h2>
                        <p>Your reservation for Point 4 from <strong>${checkInDate} to ${checkOutDate}</strong> has been cancelled.</p>
                        <br />
                        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">For questions, contact Nick Hickman at 405-816-6424 or Lou Graham at 501-690-0554</p>
                      </div>
                    `
                });
                if (error) console.error("Resend User Cancel Error:", error);
            }
        } else if (action === 'book') {
             const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Stay+at+Point+4&dates=${checkInDate.replace(/-/g, '')}/${checkOutDate.replace(/-/g, '')}&details=Your+reservation+at+Point+4+Lakehouse.&location=1173+Fox+Chase+Rd,+Heber+Springs,+AR`;
             
             // Notify the user about the booking
             if (userEmail) {
                 const { data, error } = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: 'nicholasghickman@gmail.com', // Restricted for Resend Testing
                    subject: 'Point 4 - Booking Confirmed',
                    html: `
                      <div style="font-family: sans-serif; color: #0A2540;">
                        <h2>Hi ${guestName},</h2>
                        <p>Your reservation for Point 4 from <strong>${checkInDate} to ${checkOutDate}</strong> is confirmed!</p>
                        <p>We'll send you a reminder before your trip.</p>
                        <br />
                        <p><a href="${gcalLink}" style="display: inline-block; background-color: #0A2540; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px; font-weight: bold;">Add to Google Calendar</a></p>
                        <br />
                        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">For questions, contact Nick Hickman at 405-816-6424 or Lou Graham at 501-690-0554</p>
                      </div>
                    `
                });
                if (error) console.error("Resend User Book Error:", error);
            }
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('Email Notification Error:', err);
        res.status(500).json({ error: err.message });
    }
});
apiRouter.delete('/bookings/:id', withUserAuth, async (req: AuthRequest, res: Response) => {
    try {
        const bookingId = req.params.id;
        
        const bookingRef = dbAdmin.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();
            
        if (!bookingDoc.exists) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }

        const booking = bookingDoc.data()!;

        if (booking.user_id !== req.user.uid) {
            res.status(403).json({ error: 'Unauthorized to delete this booking' });
            return;
        }

        await bookingRef.delete();

        // Dispatch Resend payload to Admin layer
        try {
            const profilesSnap = await dbAdmin.collection('profiles').where('is_admin', '==', true).get();
            const adminEmails = profilesSnap.docs.map(doc => doc.data().email).filter(Boolean);

            const userProfileRef = await dbAdmin.collection('profiles').doc(booking.user_id).get();
            const guestName = userProfileRef.exists ? userProfileRef.data()?.first_name : 'A family member';
            
            if (process.env.RESEND_API_KEY && adminEmails.length > 0) {
                const resend = getResend();
                const { data, error } = await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: 'nicholasghickman@gmail.com', // Restricted for Resend Testing
                    subject: 'Point 4 - Booking Cancelled (Admin Notice)',
                    html: `
                      <div style="font-family: sans-serif; color: #0A2540;">
                        <h2>Booking Cancellation Notice</h2>
                        <p>${guestName} has cancelled their reservation.</p>
                        <hr />
                        <p><strong>Dates released:</strong> ${booking.check_in_date} to ${booking.check_out_date}</p>
                        <br />
                        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">For questions, contact Nick Hickman at 405-816-6424 or Lou Graham at 501-690-0554</p>
                      </div>
                    `
                });
                if (error) console.error("Resend Cancel Delete Route Error:", error);
            }
        } catch (emailErr) {
            console.error('Email dispatcher failed temporarily, but the cancellation was executed:', emailErr);
        }

        res.json({ success: true, message: "Booking cancelled safely. Admins notified." });
    } catch (err: any) {
        console.error('Cancellation Controller Error:', err);
        res.status(500).json({ error: err.message || 'Failed to cancel booking' });
    }
});

