"""
Integration tests for the new user onboarding flow.

These tests validate the hypothesis that 404 errors on GET /household/profile
are expected during new user onboarding before the household profile is created.

Flow under test:
1. New user (no profile) gets 404 on GET /household/profile
2. Onboarding status returns defaults for new users
3. User completes onboarding via POST /household/onboarding
4. Subsequent GET /household/profile succeeds
5. Alternative: User skips onboarding via POST /household/onboarding/skip
"""
import pytest
import uuid


@pytest.fixture
def new_workspace_id():
    """Generate a unique workspace ID for each test."""
    return f"test-{uuid.uuid4().hex[:8]}"


class TestNewUserOnboarding:
    """Test the expected 404 → onboarding → success flow."""

    def test_new_workspace_gets_404_on_profile(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a new workspace with no data
        WHEN GET /household/profile is called
        THEN return 404 with appropriate message

        This confirms the 404 is EXPECTED behavior for new users.
        """
        client, _ = client_with_mock_supabase

        response = client.get(
            "/household/profile",
            params={"workspace_id": new_workspace_id}
        )

        assert response.status_code == 404
        assert "No household profile found" in response.json()["detail"]

    def test_new_workspace_onboarding_status_returns_defaults(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a new workspace with no data
        WHEN GET /household/onboarding-status is called
        THEN return default OnboardingStatus (not completed, not dismissed)

        Frontend uses this to decide whether to show the onboarding wizard.
        """
        client, _ = client_with_mock_supabase

        response = client.get(
            "/household/onboarding-status",
            params={"workspace_id": new_workspace_id}
        )

        assert response.status_code == 200
        status = response.json()
        assert status["completed"] is False
        assert status["skipped_count"] == 0
        assert status["permanently_dismissed"] is False
        assert status["completed_at"] is None

    def test_complete_onboarding_creates_profile(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a new workspace with no profile
        WHEN POST /household/onboarding is called with valid data
        THEN create a new household profile and return it
        """
        client, store = client_with_mock_supabase

        onboarding_data = {
            "skill_level": "intermediate",
            "cooking_frequency": "few_times_week",
            "kitchen_equipment_level": "standard",
            "pantry_stock_level": "moderate",
            "primary_goal": "meal_planning",
            "cuisine_preferences": ["italian", "mexican"],
            "dietary_goals": "mixed",
            "dietary_patterns": [],
            "household_members": [
                {
                    "name": "Test User",
                    "age_group": "adult",
                    "allergies": [],
                    "dislikes": [],
                    "likes": [],
                    "diet": []
                }
            ]
        }

        response = client.post(
            "/household/onboarding",
            json=onboarding_data,
            params={"workspace_id": new_workspace_id}
        )

        assert response.status_code == 200
        profile = response.json()
        assert len(profile["family_members"]) == 1
        assert profile["family_members"][0]["name"] == "Test User"
        assert profile["onboarding_status"]["completed"] is True
        assert profile["onboarding_status"]["completed_at"] is not None

        # Verify stored in mock
        assert new_workspace_id in store["household_profiles"]

    def test_profile_accessible_after_onboarding(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a workspace that has completed onboarding
        WHEN GET /household/profile is called
        THEN return the household profile (not 404)

        This proves the onboarding flow resolves the 404.
        """
        client, _ = client_with_mock_supabase

        # First, complete onboarding
        onboarding_data = {
            "skill_level": "beginner",
            "cooking_frequency": "rarely",
            "kitchen_equipment_level": "minimal",
            "pantry_stock_level": "minimal",
            "primary_goal": "grocery_management",
            "cuisine_preferences": [],
            "dietary_goals": "cook_fresh",
            "dietary_patterns": [],
            "household_members": [
                {
                    "name": "Another User",
                    "age_group": "adult",
                    "allergies": ["peanuts"],
                    "dislikes": [],
                    "likes": [],
                    "diet": []
                }
            ]
        }

        client.post(
            "/household/onboarding",
            json=onboarding_data,
            params={"workspace_id": new_workspace_id}
        )

        # Now GET should succeed (not 404!)
        response = client.get(
            "/household/profile",
            params={"workspace_id": new_workspace_id}
        )

        assert response.status_code == 200
        profile = response.json()
        assert profile["family_members"][0]["name"] == "Another User"


class TestSkipOnboarding:
    """Test the skip onboarding flow."""

    def test_skip_onboarding_creates_minimal_profile(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a new workspace
        WHEN POST /household/onboarding/skip is called
        THEN create a minimal profile with default member and increment skip count
        """
        client, store = client_with_mock_supabase

        response = client.post(
            "/household/onboarding/skip",
            params={"workspace_id": new_workspace_id, "permanent": False}
        )

        assert response.status_code == 200
        status = response.json()
        assert status["skipped_count"] == 1
        assert status["completed"] is False
        assert status["permanently_dismissed"] is False

        # Verify profile was created in mock
        assert new_workspace_id in store["household_profiles"]

    def test_skip_onboarding_permanent_dismisses(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a new workspace
        WHEN POST /household/onboarding/skip?permanent=true is called
        THEN mark onboarding as permanently dismissed
        """
        client, _ = client_with_mock_supabase

        response = client.post(
            "/household/onboarding/skip",
            params={"workspace_id": new_workspace_id, "permanent": True}
        )

        assert response.status_code == 200
        status = response.json()
        assert status["permanently_dismissed"] is True

    def test_profile_accessible_after_skip(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a workspace that skipped onboarding
        WHEN GET /household/profile is called
        THEN return the minimal profile (not 404)
        """
        client, _ = client_with_mock_supabase

        # Skip onboarding
        client.post(
            "/household/onboarding/skip",
            params={"workspace_id": new_workspace_id}
        )

        # Profile should now exist
        response = client.get(
            "/household/profile",
            params={"workspace_id": new_workspace_id}
        )

        assert response.status_code == 200
        profile = response.json()
        assert len(profile["family_members"]) == 1
        assert profile["family_members"][0]["name"] == "Me"

    def test_skip_count_increments(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN a workspace that has skipped once
        WHEN skip is called again
        THEN skip count increments
        """
        client, _ = client_with_mock_supabase

        # First skip
        response1 = client.post(
            "/household/onboarding/skip",
            params={"workspace_id": new_workspace_id}
        )
        assert response1.json()["skipped_count"] == 1

        # Second skip
        response2 = client.post(
            "/household/onboarding/skip",
            params={"workspace_id": new_workspace_id}
        )
        assert response2.json()["skipped_count"] == 2


class TestOnboardingValidation:
    """Test validation of onboarding submissions."""

    def test_onboarding_requires_household_member(self, client_with_mock_supabase, new_workspace_id):
        """
        GIVEN onboarding data with no household members
        WHEN POST /household/onboarding is called
        THEN return 422 validation error
        """
        client, _ = client_with_mock_supabase

        invalid_data = {
            "skill_level": "beginner",
            "cooking_frequency": "daily",
            "kitchen_equipment_level": "minimal",
            "pantry_stock_level": "minimal",
            "primary_goal": "meal_planning",
            "cuisine_preferences": [],
            "dietary_goals": "mixed",
            "dietary_patterns": [],
            "household_members": []  # Empty - should fail
        }

        response = client.post(
            "/household/onboarding",
            json=invalid_data,
            params={"workspace_id": new_workspace_id}
        )

        assert response.status_code == 422

    def test_onboarding_requires_workspace_id(self, client_with_mock_supabase):
        """
        GIVEN valid onboarding data
        WHEN POST /household/onboarding is called without workspace_id
        THEN return 422 (missing required parameter)
        """
        client, _ = client_with_mock_supabase

        valid_data = {
            "skill_level": "beginner",
            "cooking_frequency": "daily",
            "kitchen_equipment_level": "minimal",
            "pantry_stock_level": "minimal",
            "primary_goal": "meal_planning",
            "cuisine_preferences": [],
            "dietary_goals": "mixed",
            "dietary_patterns": [],
            "household_members": [
                {"name": "Test", "age_group": "adult", "allergies": [], "dislikes": [], "likes": [], "diet": []}
            ]
        }

        response = client.post("/household/onboarding", json=valid_data)

        assert response.status_code == 422


class TestFullOnboardingJourney:
    """Integration test for the complete onboarding journey."""

    def test_full_journey_404_to_success(self, client_with_mock_supabase, new_workspace_id):
        """
        Test the complete flow that validates the hypothesis:

        1. GET profile -> 404 (expected for new user)
        2. GET onboarding-status -> default (not completed)
        3. POST onboarding -> create profile
        4. GET profile -> success (404 resolved!)
        5. GET onboarding-status -> completed
        """
        client, _ = client_with_mock_supabase

        # Step 1: Initial 404 - this is what we're seeing in admin dashboard
        r1 = client.get("/household/profile", params={"workspace_id": new_workspace_id})
        assert r1.status_code == 404, "New user should get 404"

        # Step 2: Default onboarding status
        r2 = client.get("/household/onboarding-status", params={"workspace_id": new_workspace_id})
        assert r2.status_code == 200
        assert r2.json()["completed"] is False, "Onboarding should not be completed yet"

        # Step 3: Complete onboarding
        onboarding_data = {
            "skill_level": "advanced",
            "cooking_frequency": "daily",
            "kitchen_equipment_level": "well_equipped",
            "pantry_stock_level": "well_stocked",
            "primary_goal": "meal_planning",
            "cuisine_preferences": ["japanese", "korean"],
            "dietary_goals": "meal_prep",
            "dietary_patterns": ["high_protein"],
            "household_members": [
                {"name": "Chef", "age_group": "adult", "allergies": [], "dislikes": [], "likes": [], "diet": []}
            ]
        }
        r3 = client.post("/household/onboarding", json=onboarding_data, params={"workspace_id": new_workspace_id})
        assert r3.status_code == 200, "Onboarding should succeed"

        # Step 4: Profile now accessible - 404 is resolved!
        r4 = client.get("/household/profile", params={"workspace_id": new_workspace_id})
        assert r4.status_code == 200, "Profile should exist after onboarding"
        assert r4.json()["family_members"][0]["name"] == "Chef"

        # Step 5: Onboarding status shows completed
        r5 = client.get("/household/onboarding-status", params={"workspace_id": new_workspace_id})
        assert r5.status_code == 200
        assert r5.json()["completed"] is True, "Onboarding should be marked complete"

    def test_full_journey_skip_path(self, client_with_mock_supabase, new_workspace_id):
        """
        Test the skip path also resolves the 404:

        1. GET profile -> 404
        2. POST skip -> creates minimal profile
        3. GET profile -> success (minimal profile)
        """
        client, _ = client_with_mock_supabase

        # Step 1: 404
        r1 = client.get("/household/profile", params={"workspace_id": new_workspace_id})
        assert r1.status_code == 404

        # Step 2: Skip
        r2 = client.post("/household/onboarding/skip", params={"workspace_id": new_workspace_id})
        assert r2.status_code == 200

        # Step 3: Success
        r3 = client.get("/household/profile", params={"workspace_id": new_workspace_id})
        assert r3.status_code == 200
        assert r3.json()["family_members"][0]["name"] == "Me"
