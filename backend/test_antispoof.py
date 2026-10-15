import cv2
from liveness import predict_face_anti_spoof

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    print("ERROR: Camera could not open")
    raise SystemExit

print("Look at the camera, then press SPACE to test.")

while True:
    ok, frame = camera.read()
    if not ok:
        print("ERROR: Could not capture frame")
        break

    cv2.imshow("Anti-Spoofing Test - SPACE to test", frame)
    key = cv2.waitKey(1) & 0xFF

    
    if key == 32:
        result = predict_face_anti_spoof(frame)
        print("MODEL RESULT:", result)
        break

    if key == 27:
        break

camera.release()
cv2.destroyAllWindows()