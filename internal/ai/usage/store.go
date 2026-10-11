package usage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"plotkitycat/internal/paths"
)

const dateLayout = "2006-01-02"

// Snapshot is one local calendar day of accumulated usage.
type Snapshot struct {
	Date             string                `json:"date"`
	PromptTokens     int                   `json:"promptTokens"`
	CompletionTokens int                   `json:"completionTokens"`
	TotalTokens      int                   `json:"totalTokens"`
	Requests         int                   `json:"requests"`
	Modes            map[string]ModeCounts `json:"modes,omitempty"`
}

// ModeCounts breaks the day down by AI mode (free / subscription / custom).
type ModeCounts struct {
	TotalTokens int `json:"totalTokens"`
	Requests    int `json:"requests"`
}

// Store accumulates usage per local day and persists it as a small JSON file.
// It implements Recorder.
type Store struct {
	mu       sync.Mutex
	path     string
	now      func() time.Time
	state    Snapshot
	onChange func(Snapshot)
}

// DefaultPath returns the usage file inside the app config directory.
func DefaultPath() (string, error) {
	dir, err := paths.ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "usage.json"), nil
}

// NewStore loads the existing file at path, if any. An empty path keeps the
// store in memory only.
func NewStore(path string) *Store {
	s := &Store{path: path, now: time.Now}
	s.state = s.load()
	return s
}

// SetOnChange registers a callback invoked synchronously after each record.
func (s *Store) SetOnChange(fn func(Snapshot)) {
	s.mu.Lock()
	s.onChange = fn
	s.mu.Unlock()
}

// Record implements Recorder: roll the day over if needed, add the sample,
// persist, then notify.
func (s *Store) Record(mode string, u Usage) {
	total := u.TotalTokens
	if total == 0 {
		total = u.PromptTokens + u.CompletionTokens
	}

	s.mu.Lock()
	s.rolloverLocked()
	s.state.PromptTokens += u.PromptTokens
	s.state.CompletionTokens += u.CompletionTokens
	s.state.TotalTokens += total
	s.state.Requests++
	if s.state.Modes == nil {
		s.state.Modes = map[string]ModeCounts{}
	}
	counts := s.state.Modes[mode]
	counts.TotalTokens += total
	counts.Requests++
	s.state.Modes[mode] = counts
	s.persistLocked()
	snapshot := s.copyLocked()
	onChange := s.onChange
	s.mu.Unlock()

	if onChange != nil {
		onChange(snapshot)
	}
}

// Today returns the totals for the current day, zeroed if the day changed.
func (s *Store) Today() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rolloverLocked()
	return s.copyLocked()
}

func (s *Store) rolloverLocked() {
	today := s.now().Format(dateLayout)
	if s.state.Date != today {
		s.state = Snapshot{Date: today}
	}
}

func (s *Store) copyLocked() Snapshot {
	out := s.state
	if s.state.Modes != nil {
		out.Modes = make(map[string]ModeCounts, len(s.state.Modes))
		for k, v := range s.state.Modes {
			out.Modes[k] = v
		}
	}
	return out
}

func (s *Store) load() Snapshot {
	if s.path == "" {
		return Snapshot{}
	}
	content, err := os.ReadFile(s.path)
	if err != nil {
		return Snapshot{}
	}
	var state Snapshot
	if err := json.Unmarshal(content, &state); err != nil {
		return Snapshot{}
	}
	return state
}

// persistLocked writes best-effort; a failed write only loses the counter.
func (s *Store) persistLocked() {
	if s.path == "" {
		return
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return
	}
	content, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(s.path, content, 0o644)
}
