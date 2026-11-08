def test_logout_ends_the_session(client, login_as):
    login_as("Lecturer")
    assert client.get("/api/auth/me").status_code == 200

    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"status": "signed_out"}
    assert client.get("/api/auth/me").status_code == 401


def test_logout_when_not_signed_in_is_harmless(client):
    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert client.get("/api/auth/me").status_code == 401
