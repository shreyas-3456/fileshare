from django.urls import path
from .views import LoginView, RegisterView, ProfileView, LogoutView, FileUploadView, GetFileList, FileView, FileMetadataView, GeneratePublicLinkView, PublicFileRetrieveView, RevokePublicLinkView, PublicViewMetaData, ShareFileView, AdminLoginView, AdminFilesView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("admin/login/", AdminLoginView.as_view(), name="admin-login"),
    path("admin/files/", AdminFilesView.as_view(), name="admin-files"),
    path("register/", RegisterView.as_view(), name="register"),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('upload/', FileUploadView.as_view(), name='upload'),
    path('files/', GetFileList.as_view(), name='allFiles'),
    path('files/<int:pk>/', FileView.as_view(), name='filesView'),
    path('files/<int:pk>/metadata/',
         FileMetadataView.as_view(),
         name='file-metadata'),
    # Generate a public link (POST)
    path('files/<int:pk>/share/',
         GeneratePublicLinkView.as_view(),
         name='generate-public-link'),
    path('public/files/<str:public_token>/',
         PublicFileRetrieveView.as_view(),
         name='public-file'),
    path('public/files/<str:public_token>/metadata/',
         PublicViewMetaData.as_view(),
         name='public-metadata'),

    # Revoke public link (POST)
    path('files/<str:public_token>/revoke-public/',
         RevokePublicLinkView.as_view(),
         name='revoke-public-link'),
    path('files/<int:pk>/userShare/',
         ShareFileView.as_view(),
         name='share-file'),
]
