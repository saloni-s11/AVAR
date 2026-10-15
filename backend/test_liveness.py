import cv2
import liveness
import time


cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Could not open webcam.")
    exit()


ear_history = []
nose_history = []

blink_detected = False
left_movement = False
right_movement = False

print("\n======================================")
print("       AVAR LIVENESS TEST")
print("======================================")
print("1. Look at the camera")
print("2. Blink your eyes")
print("3. Move your head LEFT")
print("4. Move your head RIGHT")
print("Press ESC to exit.")
print("======================================\n")


while True:

    ret, frame = cap.read()

    if not ret:
        print("Could not read webcam.")
        break

    result = liveness.process_liveness_frame(frame)

    if result["face_detected"]:

        # Average eye aspect ratio
        average_ear = (
            result["left_ear"] +
            result["right_ear"]
        ) / 2.0

        ear_history.append(average_ear)

        nose_history.append(
            result["nose_position"]
        )

        # Keep recent frames only
        if len(ear_history) > 30:
            ear_history.pop(0)

        if len(nose_history) > 30:
            nose_history.pop(0)

        # -------------------------
        # Blink detection
        # -------------------------

        if liveness.detect_blink(
            ear_history
        ):
            blink_detected = True

        # -------------------------
        # Head movement
        # -------------------------

        direction = liveness.calculate_head_direction(
            nose_history
        )

        if direction == "LEFT":
            left_movement = True

        if direction == "RIGHT":
            right_movement = True

        # -------------------------
        # Display status
        # -------------------------

        cv2.putText(
            frame,
            "FACE DETECTED",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Blink: {'PASS' if blink_detected else 'WAIT'}",
            (30, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Left: {'PASS' if left_movement else 'WAIT'}",
            (30, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            f"Right: {'PASS' if right_movement else 'WAIT'}",
            (30, 160),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

        # -------------------------
        # Final decision
        # -------------------------

        if (
            blink_detected
            and left_movement
            and right_movement
        ):

            cv2.putText(
                frame,
                "LIVENESS PASSED",
                (30, 220),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (0, 255, 0),
                3
            )

            cv2.imshow(
                "AVAR Liveness",
                frame
            )

            cv2.waitKey(1500)

            print("\n**************************************")
            print("       LIVENESS PASSED")
            print("**************************************\n")

            break

    else:

        cv2.putText(
            frame,
            "NO FACE DETECTED",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )

    cv2.imshow(
        "AVAR Liveness",
        frame
    )

    key = cv2.waitKey(1) & 0xFF

    if key == 27:
        break


cap.release()
cv2.destroyAllWindows()


print("\nFinal Result:")
print("Blink:", blink_detected)
print("Left movement:", left_movement)
print("Right movement:", right_movement)