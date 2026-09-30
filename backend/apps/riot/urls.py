from django.urls import path
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .datadragon import get_champions


@extend_schema(responses=dict)
@api_view(["GET"])
def champions(request):
    return Response(get_champions())


urlpatterns = [path("champions/", champions, name="riot-champions")]
