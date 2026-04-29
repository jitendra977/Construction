from rest_framework import serializers
from ..models import WorkforceCategory, WorkforceRole

class WorkforceRoleSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    wage_type_display = serializers.CharField(source='get_default_wage_type_display', read_only=True)

    class Meta:
        model = WorkforceRole
        fields = [
            'id', 'category', 'category_name', 'title', 'code', 'trade_code',
            'description', 'requires_license', 'requires_cert', 
            'default_wage_type', 'wage_type_display', 
            'default_wage_amount', 'currency', 'is_active'
        ]

class WorkforceCategorySerializer(serializers.ModelSerializer):
    roles = WorkforceRoleSerializer(many=True, read_only=True)
    children = serializers.SerializerMethodField()
    parent_name = serializers.ReadOnlyField(source='parent.name')
    
    class Meta:
        model = WorkforceCategory
        fields = [
            'id', 'name', 'parent', 'parent_name', 'description', 
            'icon', 'color', 'is_active', 'order', 'roles', 'children'
        ]

    def get_children(self, obj):
        # Recursive serialization of children
        children = obj.children.filter(is_active=True)
        return WorkforceCategorySerializer(children, many=True).data
