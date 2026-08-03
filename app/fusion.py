def confidence_fusion(face_score, voice_score):
    """
    Weighted confidence fusion.
    Face = 70%
    Voice = 30%
    """

    fusion_score = (0.7 * face_score) + (0.3 * voice_score)

    return round(fusion_score, 2)


def authentication_status(score, threshold=70):
    if score >= threshold:
        return "Access Granted"
    else:
        return "Access Denied"