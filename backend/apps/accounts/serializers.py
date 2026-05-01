from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Role, ActivityLog

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Role
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source='role', write_only=True, required=False, allow_null=True
    )
    is_system_admin = serializers.BooleanField(read_only=True)
    can_manage_phases = serializers.BooleanField(source='can_manage_phases_perm', read_only=True)
    can_manage_finances = serializers.BooleanField(source='can_manage_finances_perm', read_only=True)
    can_manage_users = serializers.BooleanField(source='can_manage_users_perm', read_only=True)
    contractor_profile = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)
    assigned_project_ids = serializers.SerializerMethodField(read_only=True)
    assigned_projects_data = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 
            'phone_number', 'profile_image', 'bio', 'address',
            'preferred_language', 'notifications_enabled', 'typography_settings',
            'role', 'role_id', 'is_verified', 'is_system_admin',
            'can_manage_phases', 'can_manage_finances', 'can_manage_users',
            'contractor_profile', 'password', 'is_superuser',
            'assigned_projects', 'assigned_project_ids', 'assigned_projects_data',
            'is_active', 'date_joined', 'frontend_last_login',
        )
        read_only_fields = ('id', 'is_verified', 'is_system_admin', 'is_superuser', 'assigned_projects', 'date_joined', 'frontend_last_login', 'can_manage_phases', 'can_manage_finances', 'can_manage_users')

    def get_assigned_project_ids(self, obj):
        return list(obj.assigned_projects.values_list('id', flat=True))

    def get_assigned_projects_data(self, obj):
        return [{'id': p.id, 'name': p.name} for p in obj.assigned_projects.all()]

    def get_contractor_profile(self, obj):
        try:
            from apps.resources.serializers import ContractorSerializer
            return ContractorSerializer(obj.contractor_profile).data
        except Exception:
            return None
        
    def to_internal_value(self, data):
        """
        Handle backwards compatibility if needed.
        """
        if hasattr(data, 'dict'):
            new_data = data.dict()
        else:
            new_data = dict(data)
            
        return super().to_internal_value(new_data)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_display_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = '__all__'

    def get_user_display_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return obj.username or "System"

    def get_user_avatar(self, obj):
        if obj.user:
            return obj.user.get_profile_image_url()
        return f"https://ui-avatars.com/api/?name={obj.username or 'S'}&background=random&color=fff"


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)  # Kept for backwards compat
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if not data.get('email') and not data.get('username'):
            raise serializers.ValidationError("Either 'email' or 'username' is required.")
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source='role', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name', 'role_id')

    def create(self, validated_data):
        role = validated_data.pop('role', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        if role:
            user.role = role
            user.save()
            
        return user


class MyTokenObtainPairSerializer(serializers.Serializer):
    pass
