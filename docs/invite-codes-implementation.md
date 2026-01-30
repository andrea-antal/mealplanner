# Invite Codes Implementation

## Overview

Adds invite code gating for new user signups during beta. Existing users can still log in without a code.

## Files Created

### `backend/app/models/invite.py`

Pydantic models for invite codes:

```python
class InviteCode(BaseModel):
    code: str                          # e.g., "MEAL-A7X9ZB"
    created_at: datetime
    created_by: Optional[str]          # who created it
    max_uses: Optional[int]            # None = unlimited
    uses: int = 0
    expires_at: Optional[datetime]
    note: Optional[str]                # e.g., "Product Hunt launch"
    disabled: bool = False

    def is_valid(self) -> bool:        # checks disabled, uses, expiry
```

Also includes `InviteCodeCreate`, `InviteCodeResponse`, `InviteRedemption` models.

---

### `backend/app/data/invite_manager.py`

Data layer for invite codes. Stores in JSON files under `data/`:
- `data/invites.json` - all invite codes
- `data/invite_redemptions.json` - log of who used what

Functions:
- `generate_code(prefix="MEAL")` → `"MEAL-A7X9ZB"`
- `create_invite(code, max_uses, expires_in_days, note, created_by)`
- `get_invite(code)` → `InviteCode | None`
- `validate_and_use_invite(code, email)` → `(bool, message)`
- `list_invites(include_disabled)`
- `disable_invite(code)`
- `get_redemptions_for_code(code)`

---

### `backend/app/routers/invites.py`

Admin API endpoints (all require `X-Admin-Key` header):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/invites` | Create new invite code |
| GET | `/invites` | List all invite codes |
| GET | `/invites/{code}` | Get specific invite details |
| DELETE | `/invites/{code}` | Disable an invite (soft delete) |
| GET | `/invites/{code}/redemptions` | See who redeemed this code |

---

## Files Modified

### `backend/app/models/user.py`

Added optional `invite_code` to magic link request:

```python
class MagicLinkRequest(BaseModel):
    email: str
    invite_code: Optional[str] = None  # Required for new users during beta
```

---

### `backend/app/routers/auth.py`

Added import:
```python
from app.data.invite_manager import validate_and_use_invite
```

Modified `request_magic_link()` to check invite codes for new users:
```python
# Check if this is a new user (needs invite code)
existing_user = get_user_by_email(email)
if not existing_user:
    # New user - require invite code
    if not request.invite_code:
        raise HTTPException(
            status_code=400,
            detail="Invite code required for new accounts"
        )
    
    # Validate invite code
    is_valid, message = validate_and_use_invite(request.invite_code, email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
```

---

### `backend/app/routers/__init__.py`

Added:
```python
from .invites import router as invites_router
```

Updated `__all__` to include `invites_router`.

---

### `backend/app/main.py`

Added:
```python
from app.routers import ..., invites_router

app.include_router(invites_router)  # Admin-only invite management
```

---

### `frontend/src/lib/auth.ts`

Updated `requestMagicLink()` signature:
```typescript
export async function requestMagicLink(
  email: string,
  inviteCode?: string
): Promise<{ success: boolean; message: string; needsInviteCode?: boolean }>
```

Now passes `invite_code` in request body and detects "invite code required" errors.

---

### `frontend/src/contexts/AuthContext.tsx`

Updated login function signature:
```typescript
login: (email: string, inviteCode?: string) => Promise<{ success: boolean; message: string; needsInviteCode?: boolean }>;
```

---

### `frontend/src/pages/Login.tsx`

Complete rewrite to support invite codes:
- Added `inviteCode` and `showInviteCode` state
- Shows invite code field when:
  - User clicks "Have an invite code?" link, OR
  - API returns "invite code required" error
- Auto-uppercases invite code input
- Shows helpful hint about getting invite codes

---

## User Flow

### Existing User
1. Enter email → Send magic link → Check email → Done

### New User (no invite code entered)
1. Enter email → "New account! Please enter your invite code."
2. Enter invite code → Send magic link → Check email → Done

### New User (has invite code ready)
1. Click "Have an invite code?"
2. Enter email + invite code → Send magic link → Check email → Done

---

## Admin Usage

> **Note:** The backend code references JSON file storage (`data/invites.json`), but production uses Supabase. Create and manage invite codes directly in Supabase rather than through the API endpoints.

### Create an invite code

In Supabase SQL Editor:

```sql
INSERT INTO invite_codes (code, max_uses, note, created_by)
VALUES ('MEAL-ABC123', 10, 'Beta testers batch 1', 'admin');
```

### Create a custom code (e.g., for a launch)

```sql
INSERT INTO invite_codes (code, max_uses, note, expires_at)
VALUES (
  'PRODUCTHUNT',
  100,
  'PH launch',
  NOW() + INTERVAL '30 days'
);
```

### List all codes

```sql
SELECT code, uses, max_uses, note, disabled, created_at
FROM invite_codes
ORDER BY created_at DESC;
```

### Disable a code

```sql
UPDATE invite_codes
SET disabled = true
WHERE code = 'MEAL-ABC123';
```

### View redemptions

```sql
SELECT ir.*, ic.note as invite_note
FROM invite_redemptions ir
JOIN invite_codes ic ON ir.code = ic.code
ORDER BY ir.redeemed_at DESC;
```

---

## To Revert Everything

```bash
cd ~/Desktop/mealplanner
git checkout -- .
```

This discards all uncommitted changes.

---

## Questions / Decisions Not Made

- Should codes be single-use by default?
- Referral tracking (who invited who)?
- Admin UI for managing codes?
- Should invite code be stored on user record?
- Rate limiting on invite validation?
- Email notification when invite is used?
