from django.http import Http404, HttpResponse
from django.urls import path
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .datadragon import get_champions, icon_bytes


@extend_schema(responses=dict)
@api_view(["GET"])
def champions(request):
    return Response(get_champions())


# Plain Django view, public: <img> tags cannot send the JWT header, and champion art is not user data.
@require_GET
def champion_icon(request, champ_id):
    png = icon_bytes(champ_id)
    if png is None:
        raise Http404
    response = HttpResponse(png, content_type="image/png")
    response["Cache-Control"] = "public, max-age=604800"
    return response


urlpatterns = [
    path("champions/", champions, name="riot-champions"),
    path("champions/<str:champ_id>/icon.png", champion_icon, name="riot-champion-icon"),
]
