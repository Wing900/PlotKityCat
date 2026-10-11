package usage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func fixedClock(t time.Time) func() time.Time {
	return func() time.Time { return t }
}

func TestStore_RecordAccumulatesAndPersists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "usage.json")
	store := NewStore(path)
	store.now = fixedClock(time.Date(2026, 10, 11, 9, 0, 0, 0, time.Local))

	store.Record("free", Usage{PromptTokens: 100, CompletionTokens: 50, TotalTokens: 150})
	store.Record("subscription", Usage{PromptTokens: 10, CompletionTokens: 5}) // total omitted by server

	got := store.Today()
	if got.Date != "2026-10-11" {
		t.Fatalf("date = %q", got.Date)
	}
	if got.PromptTokens != 110 || got.CompletionTokens != 55 || got.TotalTokens != 165 || got.Requests != 2 {
		t.Fatalf("totals = %+v", got)
	}
	if got.Modes["free"].TotalTokens != 150 || got.Modes["subscription"].Requests != 1 {
		t.Fatalf("modes = %+v", got.Modes)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read persisted file: %v", err)
	}
	var persisted Snapshot
	if err := json.Unmarshal(raw, &persisted); err != nil {
		t.Fatalf("unmarshal persisted file: %v", err)
	}
	if persisted.TotalTokens != 165 {
		t.Fatalf("persisted total = %d", persisted.TotalTokens)
	}

	reloaded := NewStore(path)
	reloaded.now = store.now
	if reloaded.Today().TotalTokens != 165 {
		t.Fatalf("reloaded total = %d", reloaded.Today().TotalTokens)
	}
}

func TestStore_RollsOverAtMidnight(t *testing.T) {
	store := NewStore("")
	day1 := time.Date(2026, 10, 11, 23, 59, 0, 0, time.Local)
	store.now = fixedClock(day1)
	store.Record("free", Usage{TotalTokens: 42})

	store.now = fixedClock(day1.Add(2 * time.Minute))
	got := store.Today()
	if got.Date != "2026-10-12" || got.TotalTokens != 0 || got.Requests != 0 {
		t.Fatalf("expected a fresh day, got %+v", got)
	}

	store.Record("custom", Usage{TotalTokens: 7})
	if got := store.Today(); got.TotalTokens != 7 || got.Requests != 1 {
		t.Fatalf("after rollover = %+v", got)
	}
}

func TestStore_OnChangeReceivesSnapshot(t *testing.T) {
	store := NewStore("")
	var seen Snapshot
	store.SetOnChange(func(s Snapshot) { seen = s })
	store.Record("free", Usage{TotalTokens: 3})
	if seen.TotalTokens != 3 || seen.Requests != 1 {
		t.Fatalf("onChange snapshot = %+v", seen)
	}
}

func TestPackageRecorderForwardsToStore(t *testing.T) {
	store := NewStore("")
	SetRecorder(store)
	t.Cleanup(func() { SetRecorder(nil) })

	Record("free", Usage{TotalTokens: 5})
	if store.Today().TotalTokens != 5 {
		t.Fatalf("package-level Record did not reach the store")
	}
}
