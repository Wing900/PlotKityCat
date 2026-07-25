package appstate

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"plotkitycat/internal/paths"
)

const (
	SchemaVersion         = 1
	maxOnboardingVersion  = 64
	maxOnboardingLastStep = 10_000
)

const (
	OnboardingUnseen    = "unseen"
	OnboardingStarted   = "started"
	OnboardingDismissed = "dismissed"
	OnboardingCompleted = "completed"
)

type OnboardingState struct {
	Version   string `json:"version"`
	Status    string `json:"status"`
	LastStep  int    `json:"lastStep"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}

type State struct {
	SchemaVersion int             `json:"schemaVersion"`
	Onboarding    OnboardingState `json:"onboarding"`
}

type Store struct {
	mu sync.Mutex
}

func NewStore() *Store {
	return &Store{}
}

func (s *Store) LoadOnboarding() (OnboardingState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, err := load()
	if err != nil {
		return defaultOnboardingState(), err
	}

	return normalizeOnboardingState(state.Onboarding), nil
}

func (s *Store) SaveOnboarding(version string, status string, lastStep int) (OnboardingState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	normalized, err := validateOnboardingState(OnboardingState{
		Version:  version,
		Status:   status,
		LastStep: lastStep,
	})
	if err != nil {
		return defaultOnboardingState(), err
	}
	normalized.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	state, err := load()
	if err != nil {
		return defaultOnboardingState(), err
	}
	current := normalizeOnboardingState(state.Onboarding)
	if current.Version == normalized.Version {
		if current.Status == OnboardingCompleted &&
			normalized.Status != OnboardingCompleted {
			return current, nil
		}
		if current.Status == OnboardingDismissed &&
			normalized.Status == OnboardingStarted {
			return current, nil
		}
	}
	state.SchemaVersion = SchemaVersion
	state.Onboarding = normalized

	if err := save(state); err != nil {
		return defaultOnboardingState(), err
	}

	return normalized, nil
}

func load() (State, error) {
	path, err := paths.AppStatePath()
	if err != nil {
		return State{}, err
	}

	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return State{
				SchemaVersion: SchemaVersion,
				Onboarding:    defaultOnboardingState(),
			}, nil
		}
		return State{}, err
	}

	var state State
	if err := json.Unmarshal(content, &state); err != nil {
		return State{}, fmt.Errorf("decode app state: %w", err)
	}

	if state.SchemaVersion <= 0 {
		state.SchemaVersion = SchemaVersion
	}
	if state.SchemaVersion > SchemaVersion {
		return State{}, fmt.Errorf(
			"unsupported app state schema version %d",
			state.SchemaVersion,
		)
	}
	state.Onboarding = normalizeOnboardingState(state.Onboarding)
	return state, nil
}

func save(state State) error {
	path, err := paths.AppStatePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	content, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	content = append(content, '\n')

	temp, err := os.CreateTemp(filepath.Dir(path), ".app-state-*.tmp")
	if err != nil {
		return err
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)

	if err := temp.Chmod(0o600); err != nil {
		temp.Close()
		return err
	}
	if _, err := temp.Write(content); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}

	return replaceFile(tempPath, path)
}

func defaultOnboardingState() OnboardingState {
	return OnboardingState{
		Status: OnboardingUnseen,
	}
}

func normalizeOnboardingState(state OnboardingState) OnboardingState {
	status := strings.TrimSpace(state.Status)
	switch status {
	case OnboardingStarted, OnboardingDismissed, OnboardingCompleted:
	default:
		status = OnboardingUnseen
	}

	lastStep := state.LastStep
	if lastStep < 0 {
		lastStep = 0
	}

	return OnboardingState{
		Version:   strings.TrimSpace(state.Version),
		Status:    status,
		LastStep:  lastStep,
		UpdatedAt: strings.TrimSpace(state.UpdatedAt),
	}
}

func validateOnboardingState(state OnboardingState) (OnboardingState, error) {
	normalized := normalizeOnboardingState(state)
	if normalized.Version == "" {
		return OnboardingState{}, fmt.Errorf("onboarding version is empty")
	}
	if len(normalized.Version) > maxOnboardingVersion {
		return OnboardingState{}, fmt.Errorf("onboarding version is too long")
	}
	if normalized.Status != strings.TrimSpace(state.Status) {
		return OnboardingState{}, fmt.Errorf("invalid onboarding status %q", state.Status)
	}
	if normalized.LastStep > maxOnboardingLastStep {
		return OnboardingState{}, fmt.Errorf("onboarding last step is too large")
	}
	return normalized, nil
}
