from rest_framework import serializers
from apps.biometrics.models import UserFaceSignature

class FaceTrainingSerializer(serializers.Serializer):
    encoding = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        help_text="A single 128-dimensional face descriptor vector."
    )
    encodings = serializers.ListField(
        child=serializers.ListField(child=serializers.FloatField()),
        required=False,
        help_text="Multiple 128-dimensional vectors captured from different angles to be consolidated."
    )
    user_id = serializers.IntegerField(
        required=False,
        help_text="Optional target user ID. Only allowed for staff/admin to train on behalf of others."
    )

    def validate(self, attrs):
        encoding = attrs.get('encoding')
        encodings = attrs.get('encodings')

        if not encoding and not encodings:
            raise serializers.ValidationError(
                "You must provide either 'encoding' or 'encodings' list."
            )

        if encoding:
            if len(encoding) != 128:
                raise serializers.ValidationError(
                    f"Face descriptor must have exactly 128 dimensions. Received: {len(encoding)}"
                )

        if encodings:
            if len(encodings) == 0:
                raise serializers.ValidationError("The 'encodings' list cannot be empty.")
            for idx, vec in enumerate(encodings):
                if len(vec) != 128:
                    raise serializers.ValidationError(
                        f"Face descriptor at index {idx} must have exactly 128 dimensions. Received: {len(vec)}"
                    )

        return attrs


class FaceLoginSerializer(serializers.Serializer):
    username = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional username to speed up verification (1:1 matching). If omitted, 1:N database-wide lookup is performed."
    )
    encoding = serializers.ListField(
        child=serializers.FloatField(),
        required=True,
        help_text="The 128-dimensional face descriptor captured during the login scan."
    )

    def validate_encoding(self, value):
        if len(value) != 128:
            raise serializers.ValidationError(
                f"Face descriptor must have exactly 128 dimensions. Received: {len(value)}"
            )
        return value
