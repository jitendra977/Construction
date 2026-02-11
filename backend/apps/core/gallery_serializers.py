from rest_framework import serializers

class GalleryItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    url = serializers.CharField()
    title = serializers.CharField()
    category = serializers.CharField()
    group_name = serializers.CharField(required=False, allow_null=True)
    uploaded_at = serializers.DateTimeField()
    source_type = serializers.CharField()
    file_type = serializers.CharField() # e.g., 'IMAGE', 'PDF', 'OTHER'
