from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, EncryptedFile


# Custom User Admin to display and manage users
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'is_staff', 'is_superuser',
                    'date_joined')
    search_fields = ('username', 'email')
    ordering = ('-date_joined', )

    # Add actions for superuser and admin permissions
    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.is_superuser:
            # Disable delete action for non-superusers
            actions = {
                key: value
                for key, value in actions.items() if key != 'delete_selected'
            }
        return actions


# Register the custom user model and admin class
admin.site.unregister(User)  # Unregister the default User model admin
admin.site.register(User, CustomUserAdmin)


# Register EncryptedFile model with additional permissions logic
class EncryptedFileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'owner', 'uploaded_at')
    list_filter = ('owner', )
    search_fields = ('file_name', 'owner__username')
    ordering = ('-uploaded_at', )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset  # Superusers can access all files
        return queryset.filter(owner=request.user)


admin.site.register(EncryptedFile, EncryptedFileAdmin)
