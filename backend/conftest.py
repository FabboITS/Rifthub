import itertools

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.teams.models import Membership, Team

_counter = itertools.count()


@pytest.fixture
def make_user(db):
    def make(role="MANAGER", **kw):
        n = next(_counter)
        return User.objects.create_user(username=f"u{n}", email=f"u{n}@test.dev", password="x", role=role, **kw)

    return make


@pytest.fixture
def make_team(db, make_user):
    def make(owner=None, **kw):
        n = next(_counter)
        owner = owner or make_user()
        team = Team.objects.create(name=kw.pop("name", f"Team {n}"), tag=f"T{n}"[:5], owner=owner, **kw)
        Membership.objects.create(user=owner, team=team, role_in_team="ANALYST")
        return team

    return make


@pytest.fixture
def client_for():
    def make(user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    return make
