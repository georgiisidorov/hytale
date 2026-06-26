package com.github.blocktoentity;

import com.hypixel.hytale.server.core.modules.entity.component.HeadRotation;
import com.hypixel.hytale.server.core.modules.entity.component.ModelComponent;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import org.joml.Vector3d;

final class LookRayUtil {

    private LookRayUtil() {}

    static Vector3d eyePosition(TransformComponent tc, ModelComponent model) {
        Vector3d eye = new Vector3d(tc.getPosition());
        if (model != null && model.getModel() != null) {
            eye.y += model.getModel().getEyeHeight();
        }
        return eye;
    }

    static Vector3d lookDirection(HeadRotation head) {
        if (head == null || head.getRotation() == null) {
            return new Vector3d(0.0, 0.0, 1.0);
        }
        float yaw = head.getRotation().yaw();
        float pitch = head.getRotation().pitch();
        double yawRad = Math.toRadians(yaw);
        double pitchRad = Math.toRadians(pitch);
        double x = -Math.sin(yawRad) * Math.cos(pitchRad);
        double y = -Math.sin(pitchRad);
        double z = Math.cos(yawRad) * Math.cos(pitchRad);
        return new Vector3d(x, y, z).normalize();
    }
}
