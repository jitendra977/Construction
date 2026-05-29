from django.db import models
from django.conf import settings
import json

class UserFaceSignature(models.Model):
    """
    Stores 128-dimensional biometric face descriptors for users.
    Used by browser-accelerated face-api.js to perform fast, matrix-based similarity comparison.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='face_signature'
    )
    # Stored as serialized JSON array of 128 floats
    encoding = models.TextField(
        help_text="JSON serialized 128-dimensional face embedding vector."
    )
    training_samples_count = models.IntegerField(
        default=1,
        help_text="Number of samples consolidated to build this biometric profile."
    )
    image_quality_score = models.FloatField(
        default=1.0,
        help_text="Average score rating of processed facial training frames."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_encoding(self, vector_list):
        """Serializes and stores python list/ndarray of floats."""
        self.encoding = json.dumps([float(x) for x in vector_list])

    def get_encoding(self):
        """Deserializes and returns the 128-dimensional float list."""
        if not self.encoding:
            return None
        try:
            return json.loads(self.encoding)
        except Exception:
            return None

    class Meta:
        db_table = 'biometrics_user_face_signature'
        verbose_name = "User Face Signature"
        verbose_name_plural = "User Face Signatures"

    def __str__(self):
        return f"Face Signature for {self.user.username}"
