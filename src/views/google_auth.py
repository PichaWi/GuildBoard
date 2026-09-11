import logging

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse, RedirectResponse

from src.config import settings
from src.controllers.google_auth import GoogleSignInDenied, user_from_google_claims

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
_oauth = OAuth()


def google_client():
    """The registered Google client, or None while the credentials are unset."""
    if not settings.google_oauth_configured:
        return None
    client = _oauth.create_client("google")
    if client is None:
        _oauth.register(
            name="google",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            server_metadata_url=GOOGLE_DISCOVERY_URL,
            client_kwargs={"scope": "openid email profile"},
        )
        client = _oauth.create_client("google")
    return client


def _not_configured() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Google sign-in is not configured on this server.",
            "error": "OAUTH_NOT_CONFIGURED",
        },
    )


@router.get("/login", summary="Start Google OAuth2 sign-in")
async def google_login(request: Request):
    client = google_client()
    if client is None:
        return _not_configured()
    return await client.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/callback", summary="Finish Google OAuth2 sign-in and apply the @ku.th restriction")
async def google_callback(request: Request):
    client = google_client()
    if client is None:
        return _not_configured()

    try:
        token = await client.authorize_access_token(request)
    except OAuthError as error:
        logger.warning("Google OAuth2 token exchange failed: %s", error.error)
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "detail": "Google sign-in could not be completed.",
                "error": "OAUTH_EXCHANGE_FAILED",
            },
        )

    try:
        user = user_from_google_claims(token.get("userinfo") or {})
    except GoogleSignInDenied as denied:
        # A refused sign-in must not leave an earlier session behind.
        request.session.clear()
        logger.info("Refused Google sign-in: %s", denied.error)
        return JSONResponse(status_code=denied.status_code, content=denied.to_response())

    request.session.clear()
    request.session["user"] = user.as_session_data()
    return RedirectResponse(url="/calendar", status_code=status.HTTP_303_SEE_OTHER)


@router.api_route("/logout", methods=["GET", "POST"], summary="Sign out")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
