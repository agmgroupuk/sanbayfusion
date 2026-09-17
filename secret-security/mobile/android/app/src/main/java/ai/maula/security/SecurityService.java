package ai.maula.security;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service that keeps the WebView and command polling alive
 * even when the screen is off and the app is in the background.
 *
 * Android 8+ requires a visible notification for foreground services.
 * We keep the notification minimal: no vibration, no sound, low priority.
 */
public class SecurityService extends Service {

    private static final String CHANNEL_ID = "maula_security_bg";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification());
        // The actual work is done by the Capacitor WebView / JS layer
        // This service just ensures the process isn't killed
        return START_STICKY; // restart if killed
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // not a bound service
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Maula Security")
                .setContentText("Device protection active")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setPriority(NotificationCompat.PRIORITY_MIN) // lowest visibility
                .setOngoing(true)  // cannot be dismissed by user
                .setSilent(true)   // no vibration/sound
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Maula Security",
                    NotificationManager.IMPORTANCE_MIN // minimized in notification tray
            );
            channel.setDescription("Background anti-theft protection");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
