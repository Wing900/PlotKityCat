package subscription

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestStateToView_MapsFields(t *testing.T) {
	state := CacheState{
		Status:        StatusActive,
		Token:         "tok",
		DeviceID:      "dev-1",
		ExpireAt:      "2026-12-31T00:00:00Z",
		LastCheckedAt: "2026-07-19T00:00:00Z",
		Message:       "ok",
		Model:         "gpt-x",
		BaseURL:       "https://api",
	}
	view := stateToView(state)
	assert.Equal(t, StatusActive, view.Status)
	assert.True(t, view.Activated)
	assert.Equal(t, "dev-1", view.DeviceID)
	assert.Equal(t, "gpt-x", view.Model)
	assert.Equal(t, "https://api", view.BaseURL)
}

func TestStateToView_ActivatedRequiresTokenAndActive(t *testing.T) {
	assert.False(t, stateToView(CacheState{Status: StatusActive, Token: ""}).Activated)
	assert.False(t, stateToView(CacheState{Status: StatusInactive, Token: "tok"}).Activated)
	assert.True(t, stateToView(CacheState{Status: StatusActive, Token: "tok"}).Activated)
}

func TestCanUseCache_RequiresDeviceIDAndLastChecked(t *testing.T) {
	svc := &Service{}
	assert.False(t, svc.canUseCache(CacheState{}))
	assert.False(t, svc.canUseCache(CacheState{DeviceID: "d"}))
	assert.False(t, svc.canUseCache(CacheState{DeviceID: "d", LastCheckedAt: "2026-01-01T00:00:00Z"}))
}

func TestCanUseCache_UnconfiguredCaches(t *testing.T) {
	svc := &Service{}
	recent := time.Now().UTC().Add(-1 * time.Minute).Format(time.RFC3339)
	assert.True(t, svc.canUseCache(CacheState{
		DeviceID: "d", LastCheckedAt: recent, Status: StatusUnconfigured,
	}))
}

func TestCanUseCache_InactiveDoesNotCache(t *testing.T) {
	svc := &Service{}
	recent := time.Now().UTC().Add(-1 * time.Minute).Format(time.RFC3339)
	assert.False(t, svc.canUseCache(CacheState{
		DeviceID: "d", LastCheckedAt: recent, Status: StatusInactive,
	}))
}

func TestCanUseCache_ActiveRequiresFreshCheckAndFutureExpiry(t *testing.T) {
	svc := &Service{}
	recent := time.Now().UTC().Add(-1 * time.Minute).Format(time.RFC3339)
	future := time.Now().UTC().Add(1 * time.Hour).Format(time.RFC3339)
	assert.True(t, svc.canUseCache(CacheState{
		DeviceID: "d", LastCheckedAt: recent, Status: StatusActive,
		Token: "tok", ExpireAt: future,
	}))
	// 过期
	assert.False(t, svc.canUseCache(CacheState{
		DeviceID: "d", LastCheckedAt: recent, Status: StatusActive,
		Token: "tok", ExpireAt: "2020-01-01T00:00:00Z",
	}))
	// 检查时间太旧
	stale := time.Now().UTC().Add(-2 * cacheTTL()).Format(time.RFC3339)
	assert.False(t, svc.canUseCache(CacheState{
		DeviceID: "d", LastCheckedAt: stale, Status: StatusActive,
		Token: "tok", ExpireAt: future,
	}))
}

func TestCanUseCache_BadTimestampReturnsFalse(t *testing.T) {
	svc := &Service{}
	assert.False(t, svc.canUseCache(CacheState{
		DeviceID: "d", LastCheckedAt: "not-a-time", Status: StatusActive,
		Token: "tok", ExpireAt: "2026-01-01T00:00:00Z",
	}))
}

func TestResolveDeviceID_UsesStoredIDWithoutProviderCall(t *testing.T) {
	svc := &Service{deviceIDProvider: &stubDeviceProvider{calls: 0}}
	id, changed, err := svc.resolveDeviceID(&CacheState{DeviceID: "stored-id"})
	assert.NoError(t, err)
	assert.Equal(t, "stored-id", id)
	assert.False(t, changed)
}

func TestResolveDeviceID_FallsBackToProvider(t *testing.T) {
	provider := &stubDeviceProvider{calls: 0}
	svc := &Service{deviceIDProvider: provider}
	id, changed, err := svc.resolveDeviceID(&CacheState{})
	assert.NoError(t, err)
	assert.Equal(t, "from-provider", id)
	assert.True(t, changed)
}

type stubDeviceProvider struct{ calls int }

func (s *stubDeviceProvider) ID() (string, error) {
	s.calls++
	return "from-provider", nil
}