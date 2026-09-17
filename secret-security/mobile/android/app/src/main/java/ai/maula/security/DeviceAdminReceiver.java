package ai.maula.security;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Device Administration receiver.
 *
 * When Device Administrator is granted, the user cannot easily uninstall
 * this app — they would first have to revoke admin status in Settings.
 *
 * To activate, the user must grant Device Admin during first launch.
 * We request this during the post-consent install flow.
 */
public class DeviceAdminReceiver extends android.app.admin.DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        // Device admin granted — app is now protected from easy uninstall
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        return "Are you sure? This will disable anti-theft protection for this device.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        // Admin revoked — app can now be uninstalled
        // We do nothing here — we respect the user's choice
    }
}
