from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()

# Ícone SVG mínimo para eliminar 404 no /favicon.ico
_FAVICON_SVG = b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0f172a"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
  <circle cx="16" cy="16" r="3" fill="#3b82f6"/>
</svg>"""


@router.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=_FAVICON_SVG, media_type="image/svg+xml")
