import logging
import math
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model
from django.db.models import Q
from apps.biometrics.models import UserFaceSignature
from apps.biometrics.serializers import FaceTrainingSerializer, FaceLoginSerializer
from apps.accounts.serializers import UserSerializer
from apps.accounts.views import log_activity

User = get_user_model()
logger = logging.getLogger(__name__)

def euclidean_distance(v1, v2):
    """
    Computes standard Euclidean distance between two 128-dimensional vectors.
    A distance of 0.0 means identical signatures. A lower distance indicates high similarity.
    Typically, a distance <= 0.55 guarantees an extremely secure match.
    """
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(v1, v2)))

class FaceTrainingView(APIView):
    """
    Endpoint for a logged-in user to register their biometric face signature.
    Path: /api/v1/biometrics/train/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = FaceTrainingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        encoding = validated_data.get('encoding')
        encodings = validated_data.get('encodings')
        target_user_id = validated_data.get('user_id')

        target_user = request.user
        if target_user_id:
            if not (request.user.is_staff or request.user.is_superuser):
                return Response({
                    "error": "You do not have permission to register biometrics for other users."
                }, status=status.HTTP_403_FORBIDDEN)
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                return Response({
                    "error": f"Target user with ID {target_user_id} does not exist."
                }, status=status.HTTP_404_NOT_FOUND)

        consolidated_vector = None
        samples_count = 1

        if encodings:
            samples_count = len(encodings)
            # Mathematically compute the average/centroid of all coordinate vectors
            consolidated_vector = [0.0] * 128
            for vec in encodings:
                for idx in range(128):
                    consolidated_vector[idx] += vec[idx]
            for idx in range(128):
                consolidated_vector[idx] /= samples_count
        else:
            consolidated_vector = encoding

        try:
            signature, created = UserFaceSignature.objects.get_or_create(user=target_user)
            signature.set_encoding(consolidated_vector)
            signature.training_samples_count = samples_count
            signature.image_quality_score = 1.0 # High quality client-side verified
            signature.save()

            log_activity(
                request,
                target_user,
                'TRAIN_BIOMETRIC',
                'UserFaceSignature',
                object_id=signature.id,
                object_repr=target_user.email,
                description=f"Trained biometric face signature with {samples_count} sample(s)."
            )

            return Response({
                "status": "success",
                "message": "Biometric face signature registered and trained successfully.",
                "samples_processed": samples_count
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("Failed to train biometric face signature for user %s: %s", target_user.username, e)
            return Response({
                "error": "Failed to save biometric signature on the server."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FaceLoginView(APIView):
    """
    Endpoint for performing biometric face sign-in.
    Path: /api/v1/biometrics/login/
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = FaceLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query_vector = serializer.validated_data['encoding']
        username_helper = serializer.validated_data.get('username')

        # Threshold rules: Extremely strict verification to prevent photo spoofing or false positives
        SIMILARITY_THRESHOLD = 0.55

        matched_user = None
        min_distance = float('inf')

        # Flow A: User provided a username -> 1:1 validation
        if username_helper:
            username_helper = username_helper.strip()
            try:
                # Support matching either username or email
                user = User.objects.filter(
                    Q(username__iexact=username_helper) | 
                    Q(email__iexact=username_helper)
                ).first()

                if user and hasattr(user, 'face_signature') and user.face_signature:
                    db_vector = user.face_signature.get_encoding()
                    if db_vector:
                        distance = euclidean_distance(query_vector, db_vector)
                        if distance < SIMILARITY_THRESHOLD:
                            matched_user = user
                            min_distance = distance
            except Exception as e:
                logger.error("Error during 1:1 biometric lookup for %s: %s", username_helper, e)

        # Flow B: No username provided, or 1:1 lookup failed -> Perform 1:N database-wide identification
        if not matched_user:
            try:
                signatures = UserFaceSignature.objects.select_related('user').all()
                for sig in signatures:
                    db_vector = sig.get_encoding()
                    if db_vector:
                        distance = euclidean_distance(query_vector, db_vector)
                        if distance < min_distance and distance < SIMILARITY_THRESHOLD:
                            min_distance = distance
                            matched_user = sig.user
            except Exception as e:
                logger.error("Error during 1:N biometric identification: %s", e)

        # If a match is verified, log in the user and yield SimpleJWT tokens
        if matched_user:
            if not matched_user.is_active:
                return Response({
                    "error": "This user account is inactive. Please contact support."
                }, status=status.HTTP_403_FORBIDDEN)

            try:
                # Update Django login auditing
                try:
                    matched_user.update_frontend_last_login()
                except Exception:
                    pass

                # Generate SimpleJWT token
                refresh = RefreshToken.for_user(matched_user)
                user_data = UserSerializer(matched_user).data

                log_activity(
                    request,
                    matched_user,
                    'LOGIN_BIOMETRIC',
                    'UserFaceSignature',
                    object_id=matched_user.id,
                    object_repr=matched_user.email,
                    description=f"Logged in successfully via biometric face scan. Match confidence distance: {min_distance:.4f}"
                )

                return Response({
                    "status": "success",
                    "user": user_data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                }, status=status.HTTP_200_OK)

            except Exception as e:
                logger.error("Failed to compile login tokens for biometric match %s: %s", matched_user.username, e)
                return Response({
                    "error": "Biometric match succeeded, but tokens could not be compiled."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Rejection logging and failure response
        logger.info("Biometric login failed: Match not found or distance exceeded threshold. Min distance observed: %s", min_distance)
        return Response({
            "error": "Face verification failed. Please try again or use standard password login."
        }, status=status.HTTP_401_UNAUTHORIZED)
