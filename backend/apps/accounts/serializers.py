from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('bio', 'avatar', 'phone_number', 'address', 'preferred_language', 'notifications_enabled')

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile')
        read_only_fields = ('id', 'username', 'email', 'role')
        
    def to_internal_value(self, data):
        """
        Handle flattened profile fields from FormData (e.g. 'profile.bio').
        This allows clients to send nested profile data in multipart/form-data.
        """
        # Create a mutable copy if it's a QueryDict
        if hasattr(data, 'dict'):
            new_data = data.dict()
        else:
            new_data = dict(data)
            
        profile_data = new_data.get('profile', {})
        if not isinstance(profile_data, dict):
            profile_data = {}
            
        keys_to_remove = []
        for key, value in new_data.items():
            if key.startswith('profile.'):
                field_name = key.split('.', 1)[1]
                profile_data[field_name] = value
                keys_to_remove.append(key)
        
        if profile_data:
            new_data['profile'] = profile_data
            for key in keys_to_remove:
                if key in new_data:
                    del new_data[key]
                    
        return super().to_internal_value(new_data)

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        # Update profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name', 'role')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'ADMIN')
        )
        return user

class MyTokenObtainPairSerializer(serializers.Serializer):
    # If you're customizing token logic, add it here.
    # Otherwise, you can just inherit from TokenObtainPairSerializer
    pass
