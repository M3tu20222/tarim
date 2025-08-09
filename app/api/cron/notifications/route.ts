import { NextResponse } from 'next/server';
import { sendNotifications } from '@/lib/notification-service';

export async function GET() {
  try {
    // Burada bildirim gönderme mantığı çağrılacak
    // Örneğin, gönderilecek bildirimleri veritabanından alıp gönderebiliriz.
    // await sendNotifications(); 
    console.log('Notification cron job executed.');
    return NextResponse.json({ message: 'Notifications sent successfully.' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json({ error: 'Failed to send notifications.' }, { status: 500 });
  }
}
