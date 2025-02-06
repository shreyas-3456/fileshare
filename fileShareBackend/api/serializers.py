from rest_framework import serializers
from django.contrib.auth.models import User
from .models import FileShare, EncryptedFile


# User Serializer
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True)  # Hide password from responses

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "date_joined"]

    def create(self, validated_data):
        """Override create method to hash the password before saving."""
        user = User(username=validated_data["username"],
                    email=validated_data.get("email", ""))
        user.set_password(validated_data["password"])  # Hash password
        user.save()
        return user


class EncryptedFileListSerializer(serializers.ModelSerializer):
    owner = serializers.StringRelatedField(
        read_only=True)  # display owner's username

    class Meta:
        model = EncryptedFile
        fields = [
            'id', 'file_name', 'uploaded_at', 'owner', 'public_token',
            "public_token_expires"
        ]


class FileShareSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = FileShare
        fields = ['user', 'access_type']


class AdminFileSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source='owner.username')
    shared_with = serializers.SlugRelatedField(many=True,
                                               read_only=True,
                                               slug_field='username')

    class Meta:
        model = EncryptedFile
        fields = ['id', 'file_name', 'owner', 'shared_with', 'uploaded_at']
